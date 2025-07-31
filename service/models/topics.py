from typing import TYPE_CHECKING, List
from uuid import UUID

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .messages import Message
    from .sessions import Session


class TopicBase(SQLModel):
    """
    Base model for topics.
    """

    name: str
    description: str | None = None
    is_active: bool = True
    session_id: UUID = Field(foreign_key="session.id")


class Topic(TopicBase, table=True):
    id: UUID = Field(default=None, primary_key=True, index=True)

    session_id: UUID = Field(foreign_key="session.id")
    session: "Session" = Relationship(back_populates="topics")
    messages: List["Message"] = Relationship(back_populates="topic", sa_relationship_kwargs={"lazy": "selectin"})


class TopicCreate(TopicBase):
    session_id: UUID


class TopicRead(TopicBase):
    id: UUID


class TopicUpdate(SQLModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None
