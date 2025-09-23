import json
import logging
from datetime import datetime, timezone
from typing import Dict
from uuid import UUID

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import selectinload
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from core.chat import get_ai_response_stream
from middleware.auth import get_current_user_websocket
from middleware.database import get_session
from models.agent import Agent as AgentModel
from models.message import Message as MessageModel
from models.message import MessageCreate
from models.sessions import Session as SessionModel
from models.topic import Topic as TopicModel

# --- Logger Setup ---
logger = logging.getLogger(__name__)
router = APIRouter()


# --- Connection Manager ---
class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, session_id: str) -> None:
        await websocket.accept()
        self.active_connections[session_id] = websocket

    def disconnect(self, session_id: str) -> None:
        if session_id in self.active_connections:
            del self.active_connections[session_id]

    async def send_personal_message(self, message: str, session_id: str) -> None:
        if session_id in self.active_connections:
            await self.active_connections[session_id].send_text(message)

    async def broadcast(self, message: str) -> None:
        for connection in self.active_connections.values():
            await connection.send_text(message)


manager = ConnectionManager()


# --- WebSocket Endpoint ---
@router.websocket("/sessions/{session_id}/topics/{topic_id}")
async def chat_websocket(
    websocket: WebSocket,
    session_id: UUID,
    topic_id: UUID,
    user: str = Depends(get_current_user_websocket),
    db: AsyncSession = Depends(get_session),
) -> None:
    connection_id = f"{session_id}:{topic_id}"
    await manager.connect(websocket, connection_id)

    # Verify topic and session exist and are linked.
    # Eagerly load all relationships needed for the chat.
    statement = (
        select(TopicModel)
        .where(TopicModel.id == topic_id)
        .options(
            selectinload(getattr(TopicModel, "messages")),
            selectinload(getattr(TopicModel, "session")).options(
                selectinload(getattr(SessionModel, "agent")).options(selectinload(getattr(AgentModel, "mcp_servers")))
            ),
        )
    )
    result = await db.exec(statement)
    topic = result.one_or_none()

    if not topic or topic.session_id != session_id:
        await websocket.close(code=4004, reason="Topic not found or does not belong to the session")
        return

    # Optional: Verify session belongs to user
    session = await db.get(SessionModel, session_id)
    if not session or session.user_id != user:
        await websocket.close(code=4003, reason="Session not found or access denied")
        return

    try:
        while True:
            data = await websocket.receive_json()
            message_text = data.get("message")

            if not message_text:
                continue

            # 1. Save user message to the topic
            user_message_create = MessageCreate(role="user", content=message_text, topic_id=topic_id)
            user_message = MessageModel.model_validate(user_message_create)
            db.add(user_message)

            # Update topic's updated_at timestamp
            topic.updated_at = datetime.now(timezone.utc)
            db.add(topic)

            await db.commit()
            await db.refresh(user_message)

            # Send user message to client first
            await manager.send_personal_message(
                user_message.model_dump_json(),
                connection_id,
            )

            # Send loading status
            loading_event = {"type": "loading", "data": {"message": "AI is thinking..."}}
            await manager.send_personal_message(
                json.dumps(loading_event),
                connection_id,
            )

            # Re-query the topic to get the updated messages list
            # This ensures we have a fresh, complete view of all messages
            statement_refresh = (
                select(TopicModel)
                .where(TopicModel.id == topic_id)
                .options(
                    selectinload(getattr(TopicModel, "messages")),
                    selectinload(getattr(TopicModel, "session")).options(
                        selectinload(getattr(SessionModel, "agent")).options(
                            selectinload(getattr(AgentModel, "mcp_servers"))
                        )
                    ),
                )
            )
            result_refresh = await db.exec(statement_refresh)
            topic_refreshed = result_refresh.one()

            # Stream AI response
            ai_message_id = None
            full_content = ""

            async for stream_event in get_ai_response_stream(message_text, topic_refreshed):
                await manager.send_personal_message(
                    json.dumps(stream_event),
                    connection_id,
                )

                # Track message ID and content for database saving
                if stream_event["type"] == "streaming_start":
                    ai_message_id = stream_event["data"]["id"]
                elif stream_event["type"] == "streaming_chunk" and ai_message_id:
                    full_content += stream_event["data"]["content"]
                elif stream_event["type"] == "streaming_end":
                    full_content = stream_event["data"].get("content", full_content)
                elif stream_event["type"] == "message":
                    # Handle non-streaming response
                    ai_message_id = stream_event["data"]["id"]
                    full_content = stream_event["data"]["content"]
                elif stream_event["type"] == "error":
                    full_content = stream_event["data"]["error"]
                    break

            # Save AI message to database
            if ai_message_id and full_content:
                ai_message_create = MessageCreate(role="assistant", content=full_content, topic_id=topic_id)
                ai_message = MessageModel.model_validate(ai_message_create)
                db.add(ai_message)

                # Update topic's updated_at timestamp again after AI response
                topic_refreshed.updated_at = datetime.now(timezone.utc)
                db.add(topic_refreshed)

                await db.commit()
                await db.refresh(ai_message)

                # Send final message confirmation with real database ID
                final_message_event = {
                    "type": "message_saved",
                    "data": {
                        "stream_id": ai_message_id,
                        "db_id": str(ai_message.id),
                        "created_at": ai_message.created_at.isoformat(),
                    },
                }
                await manager.send_personal_message(
                    json.dumps(final_message_event),
                    connection_id,
                )

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for topic {connection_id}")
    except Exception as e:
        logger.error(f"An error occurred in WebSocket for topic {connection_id}: {e}")
    finally:
        manager.disconnect(connection_id)
