from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from middleware.database import get_session
from models.message import Message, MessageRead
from models.topic import Topic

router = APIRouter()


@router.get("/{topic_id}/messages", response_model=List[MessageRead])
async def get_topic_messages(topic_id: UUID, db: AsyncSession = Depends(get_session)) -> list[Message]:
    """
    Get all messages for a specific topic, ordered by creation time.
    """
    topic = await db.get(Topic, topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    statement = select(Message).where(Message.topic_id == topic_id).order_by(Message.created_at)  # type: ignore
    result = await db.exec(statement)
    messages = result.all()
    return list(messages)
