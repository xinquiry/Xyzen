from typing import List
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from middleware.database import get_session
from models.message import Message, MessageRead
from models.sessions import Session
from models.topic import Topic, TopicCreate, TopicRead

router = APIRouter()


class TopicUpdate(BaseModel):
    name: str


@router.post("/", response_model=TopicRead)
async def create_topic(topic_data: TopicCreate, db: AsyncSession = Depends(get_session)) -> Topic:
    """
    Create a new topic in an existing session.
    """
    # Verify that the session exists
    session = await db.get(Session, topic_data.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Create the topic
    topic = Topic.model_validate(topic_data)
    topic.id = uuid4()

    db.add(topic)
    await db.commit()
    await db.refresh(topic)

    return topic


@router.put("/{topic_id}", response_model=TopicRead)
async def update_topic(topic_id: UUID, topic_data: TopicUpdate, db: AsyncSession = Depends(get_session)) -> Topic:
    """
    Update a topic's name.
    """
    topic = await db.get(Topic, topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    # Update the topic name
    topic.name = topic_data.name

    db.add(topic)
    await db.commit()
    await db.refresh(topic)

    return topic


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
