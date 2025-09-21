from datetime import datetime
from typing import List
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from middleware.auth import get_current_user
from middleware.database import get_session
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
    from uuid import UUID

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
