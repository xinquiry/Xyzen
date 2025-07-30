from typing import TYPE_CHECKING, List
from uuid import UUID

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .messages import Message
    from .sessions import Session
    from .threads import Thread
    from .topics import Topic


class UserBase(SQLModel):
    name: str | None = None
    email: str = Field(unique=True, index=True)
    avatar: str | None = None
    password: str


class User(UserBase, table=True):
    id: UUID = Field(default=None, primary_key=True, index=True)

    sessions: List["Session"] = Relationship(back_populates="user")
    messages: List["Message"] = Relationship(back_populates="user")
    topics: List["Topic"] = Relationship(back_populates="user")
    threads: List["Thread"] = Relationship(back_populates="user")


class UserCreate(UserBase):
    pass


class UserRead(UserBase):
    id: UUID


class UserUpdate(SQLModel):
    name: str | None = None
    email: str | None = None
    avatar: str | None = None
    password: str | None = None
