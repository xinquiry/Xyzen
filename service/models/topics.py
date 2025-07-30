from typing import TYPE_CHECKING, List
from uuid import UUID

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .messages import Message
    from .sessions import Session
    from .users import User


class TopicBase(SQLModel):
    """
    Base model for topics.
    """

    name: str
    description: str | None = None
    is_active: bool = True
    user_id: UUID = Field(foreign_key="user.id")
    session_id: UUID = Field(foreign_key="session.id")


class Topic(TopicBase, table=True):
    id: UUID = Field(default=None, primary_key=True, index=True)

    user: "User" = Relationship(back_populates="topics")
    session: "Session" = Relationship(back_populates="topics")
    messages: List["Message"] = Relationship(back_populates="topic")


class TopicCreate(TopicBase):
    pass


class TopicRead(TopicBase):
    id: UUID


class TopicUpdate(SQLModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None
