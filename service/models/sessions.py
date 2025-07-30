from typing import TYPE_CHECKING, List
from uuid import UUID

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .topics import Topic
    from .users import User


class SessionBase(SQLModel):
    """
    Base model for sessions.
    """

    name: str
    description: str | None = None
    is_active: bool = True
    user_id: UUID = Field(foreign_key="user.id")


class Session(SessionBase, table=True):
    id: UUID = Field(default=None, primary_key=True, index=True)

    user: "User" = Relationship(back_populates="sessions")
    topics: List["Topic"] = Relationship(back_populates="session")


class SessionCreate(SessionBase):
    pass


class SessionRead(SessionBase):
    id: UUID


class SessionUpdate(SQLModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None
