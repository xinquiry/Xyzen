from uuid import uuid4

from fastapi import APIRouter, Depends
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from middleware.database import get_session
from models.sessions import Session, SessionCreate, SessionRead
from models.topics import Topic, TopicCreate

router = APIRouter()


@router.post("/", response_model=SessionRead)
async def create_session_with_default_topic(
    session_data: SessionCreate, db: AsyncSession = Depends(get_session)
) -> Session:
    """
    Create a new session and a default topic within it.
    Returns the newly created session with its topics.
    """
    # Create the session instance
    session = Session.model_validate(session_data)
    session.id = uuid4()

    # Create a default topic for this session
    default_topic = Topic.model_validate(
        TopicCreate(
            name="New Topic",
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
