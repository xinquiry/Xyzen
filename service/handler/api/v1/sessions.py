from datetime import datetime
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from middleware.auth import get_auth_provider, is_auth_configured
from middleware.database import get_session
from models.sessions import Session, SessionCreate, SessionRead
from models.topic import Topic, TopicCreate


async def get_current_user(authorization: Optional[str] = Header(None)) -> str:
    """从 Authorization header 中获取当前用户ID"""

    # 检查认证服务是否配置
    if not is_auth_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Authentication service is not configured"
        )

    # 检查 Authorization header
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authorization header")

    # 解析 Bearer token
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization header format")

    access_token = authorization[7:]  # Remove "Bearer " prefix

    # 获取认证提供商并验证 token
    provider = get_auth_provider()
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Authentication provider initialization failed"
        )

    auth_result = provider.validate_token(access_token)
    if not auth_result.success or not auth_result.user_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=auth_result.error_message or "Token validation failed"
        )

    return auth_result.user_info.id


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
