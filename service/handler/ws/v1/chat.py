import logging
from datetime import datetime, timezone
from typing import Dict
from uuid import UUID

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from core.chat import get_ai_response
from middleware.database import get_session
from models.messages import Message as MessageModel
from models.messages import MessageCreate
from models.sessions import Session as SessionModel
from models.topics import Topic as TopicModel

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


# --- Placeholder for Authentication ---
# TODO: Replace with your actual user authentication logic from Casdoor
async def get_current_user(websocket: WebSocket) -> str:
    # This is a placeholder. In a real app, you'd get the user
    # from a token passed in headers or query params.
    # For now, we'll use a hardcoded username that matches the session owner.
    return "Harvey"


# --- WebSocket Endpoint ---
@router.websocket("/sessions/{session_id}/topics/{topic_id}")
async def chat_websocket(
    websocket: WebSocket,
    session_id: UUID,
    topic_id: UUID,
    user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> None:
    connection_id = f"{session_id}:{topic_id}"
    await manager.connect(websocket, connection_id)

    # Verify topic and session exist and are linked.
    # Messages are now eagerly loaded due to the model's relationship configuration.
    statement = select(TopicModel).where(TopicModel.id == topic_id)
    result = await db.exec(statement)
    topic = result.one_or_none()

    if not topic or topic.session_id != session_id:
        await websocket.close(code=4004, reason="Topic not found or does not belong to the session")
        return

    # Optional: Verify session belongs to user
    session = await db.get(SessionModel, session_id)
    if not session or session.username != user:
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
            # Refresh the topic and its messages relationship to include the new message
            await db.refresh(topic, attribute_names=["messages"])

            # 2. Get AI response
            ai_response_text = await get_ai_response(message_text, topic)

            # 3. Save AI message to the topic
            ai_message_create = MessageCreate(role="assistant", content=ai_response_text, topic_id=topic_id)
            ai_message = MessageModel.model_validate(ai_message_create)
            db.add(ai_message)

            # Update topic's updated_at timestamp again after AI response
            topic.updated_at = datetime.now(timezone.utc)
            db.add(topic)

            await db.commit()
            await db.refresh(ai_message)

            # 4. Send AI response to client
            await manager.send_personal_message(
                ai_message.model_dump_json(),
                connection_id,
            )

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for topic {connection_id}")
    except Exception as e:
        logger.error(f"An error occurred in WebSocket for topic {connection_id}: {e}")
    finally:
        manager.disconnect(connection_id)
