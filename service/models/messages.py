from typing import TYPE_CHECKING
from uuid import UUID

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .topics import Topic
    from .users import User


class MessageBase(SQLModel):
    """
    Base model for messages.
    """

    role: str  # user, assistant, system, tool
    content: str
    user_id: UUID = Field(foreign_key="user.id")
    topic_id: UUID = Field(foreign_key="topic.id")
    thread_id: str | None = Field(default=None, foreign_key="thread.id")


class Message(MessageBase, table=True):
    id: UUID = Field(default=None, primary_key=True, index=True)

    user: "User" = Relationship(back_populates="messages")
    topic: "Topic" = Relationship(back_populates="messages")


class MessageCreate(MessageBase):
    pass


class MessageRead(MessageBase):
    id: UUID


class MessageUpdate(SQLModel):
    role: str | None = None
    content: str | None = None
