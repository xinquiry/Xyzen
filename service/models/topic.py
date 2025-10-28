from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import func
from sqlmodel import Field, SQLModel

from models.message import MessageRead


class TopicBase(SQLModel):
    name: str = Field(max_length=100)
    description: str | None = Field(default=None, max_length=500)
    is_active: bool = Field(default=True)
    session_id: UUID = Field(index=True)


class Topic(TopicBase, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        sa_column_kwargs={"server_default": func.now()},
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        sa_column_kwargs={"server_default": func.now(), "onupdate": func.now()},
    )


class TopicCreate(TopicBase):
    pass


class TopicRead(TopicBase):
    id: UUID
    updated_at: datetime


class TopicReadWithMessages(TopicBase):
    """Topic response with messages included."""

    id: UUID
    updated_at: datetime
    messages: list[MessageRead] = []


class TopicUpdate(SQLModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None
