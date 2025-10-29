from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import func
from sqlmodel import Field, SQLModel

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .topic import TopicRead


class MessageBase(SQLModel):
    # role can be 'user', 'assistant', 'system', 'tool', etc.
    role: str
    content: str
    topic_id: UUID = Field(index=True)


class Message(MessageBase, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        sa_column_kwargs={"server_default": func.now()},
    )


class MessageCreate(MessageBase):
    pass


class MessageRead(MessageBase):
    id: UUID
    created_at: datetime


class MessageReadWithTopic(MessageBase):
    id: UUID
    created_at: datetime
    topic: "TopicRead | None" = None


class MessageUpdate(SQLModel):
    role: str | None = None
    content: str | None = None
