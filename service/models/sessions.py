from datetime import datetime, timezone
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import TIMESTAMP
from sqlmodel import Column, Field, SQLModel

if TYPE_CHECKING:
    from .topic import TopicRead


class SessionCreateBase(SQLModel):
    name: str = Field(max_length=100)
    description: str | None = Field(default=None, max_length=500)
    is_active: bool = True
    agent_id: UUID | None = Field(default=None, index=True)


class SessionBase(SessionCreateBase):
    user_id: str = Field(index=True)


class Session(SessionBase, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(TIMESTAMP(timezone=True), nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(TIMESTAMP(timezone=True), nullable=False, onupdate=lambda: datetime.now(timezone.utc)),
    )


class SessionCreate(SessionCreateBase):
    pass


class SessionRead(SessionBase):
    id: UUID


class SessionReadWithTopics(SessionBase):
    id: UUID
    topics: list["TopicRead"] = []


class SessionUpdate(SQLModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None
