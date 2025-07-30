from typing import TYPE_CHECKING, List
from uuid import UUID

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .messages import Message
    from .users import User


class ThreadBase(SQLModel):
    """
    Base model for AI Assistant Threads.
    The ID is usually provided by the external AI service (e.g., OpenAI).
    """

    id: str = Field(primary_key=True, index=True, description="Thread ID from the AI service")
    user_id: UUID = Field(foreign_key="user.id")


class Thread(ThreadBase, table=True):
    user: "User" = Relationship(back_populates="threads")
    messages: List["Message"] = Relationship(back_populates="thread")


class ThreadCreate(ThreadBase):
    pass


class ThreadRead(ThreadBase):
    pass


class ThreadUpdate(SQLModel):
    """
    In most cases, threads are managed by the AI service,
    but we can add metadata here if needed in the future.
    """

    pass
