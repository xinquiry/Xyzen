from datetime import datetime
from typing import List
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from middleware.auth import get_current_user
from middleware.database import get_session
from models.message import Message
from models.sessions import Session, SessionCreate, SessionRead
from models.topic import Topic, TopicCreate

router = APIRouter()


@router.post("/", response_model=SessionRead)
async def create_session_with_default_topic(
    session_data: SessionCreate, db: AsyncSession = Depends(get_session), user: str = Depends(get_current_user)
) -> Session:
    """
    Create a new session and a default topic within it.
    If agent_id is provided, the session will be associated with that agent.
    Returns the newly created session with its topics.
    The user_id is automatically extracted from the authenticated user.
    """
    # Create the session instance with user_id from authentication
    session = Session(
        id=uuid4(),
        name=session_data.name,
        description=session_data.description,
        is_active=session_data.is_active,
        user_id=user,  # Use authenticated user ID
        agent_id=session_data.agent_id,
    )

    # Create a default topic for this session with a generic name
    # The timestamp is now handled by the `updated_at` field and displayed correctly on the frontend.
    default_topic = Topic.model_validate(
        TopicCreate(
            name="新的聊天",  # Changed from a timestamp-based name
            session_id=session.id,
        )
    )
    default_topic.id = uuid4()

    db.add(session)
    db.add(default_topic)

    # Store the ID before the session object becomes expired after commit
    new_session_id = session.id

    await db.commit()

    # Re-query the session. Topics are now eagerly loaded due to the model's relationship configuration.
    result = await db.exec(select(Session).where(Session.id == new_session_id))
    new_session = result.one()

    return new_session


@router.get("/by-agent/{agent_id}", response_model=SessionRead)
async def get_session_by_agent(
    agent_id: str, user: str = Depends(get_current_user), db: AsyncSession = Depends(get_session)
) -> Session:
    """
    Get a session for the current user with a specific agent.
    Returns 404 if no session is found for this user-agent combination.
    """
    # Convert agent_id to UUID if it's a valid UUID string, otherwise treat as None for default agent
    try:
        agent_uuid = UUID(agent_id) if agent_id != "default" else None
    except ValueError:
        agent_uuid = None

    statement = select(Session).where(Session.user_id == user, Session.agent_id == agent_uuid)
    result = await db.exec(statement)
    session = result.first()

    if not session:
        raise HTTPException(status_code=404, detail="No session found for this user-agent combination")

    return session


@router.get("/", response_model=List[SessionRead])
async def get_sessions(
    user: str = Depends(get_current_user), db: AsyncSession = Depends(get_session)
) -> List[Session]:
    """
    Get all sessions for the current user, ordered by the last update time of their topics.
    """
    # Filter sessions by the current user (user_id)
    statement = select(Session).where(Session.user_id == user)
    result = await db.exec(statement)
    sessions = list(result.all())

    # Sort sessions in memory based on the most recent topic's updated_at
    sessions.sort(
        key=lambda s: max(t.updated_at for t in s.topics) if s.topics else datetime.min,
        reverse=True,
    )

    return sessions


@router.delete("/{session_id}/topics", status_code=204)
async def clear_session_topics(
    session_id: UUID, user: str = Depends(get_current_user), db: AsyncSession = Depends(get_session)
) -> None:
    """
    Clear all topics in a session (keeping only one new empty topic).
    Only allows clearing if the current user owns the session.
    """
    # Get the session
    session = await db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Verify that the current user owns this session
    if session.user_id != user:
        raise HTTPException(status_code=403, detail="Access denied: You don't have permission to clear this session")

    # Get all topics for this session
    statement = select(Topic).where(Topic.session_id == session_id)
    result = await db.exec(statement)
    topics = list(result.all())

    # Delete all messages for each topic
    for topic in topics:
        message_statement = select(Message).where(Message.topic_id == topic.id)
        message_result = await db.exec(message_statement)
        messages = list(message_result.all())
        for message in messages:
            await db.delete(message)

        # Delete the topic
        await db.delete(topic)

    # Create a new default topic
    default_topic = Topic.model_validate(
        TopicCreate(
            name="新的聊天",
            session_id=session_id,
        )
    )
    default_topic.id = uuid4()
    db.add(default_topic)

    await db.commit()
    return
