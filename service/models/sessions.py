from typing import List
from uuid import UUID

from sqlmodel import Field, Relationship, SQLModel

from .topics import Topic, TopicRead


class SessionBase(SQLModel):
    """
    Base model for sessions.
    """

    name: str
    description: str | None = None
    is_active: bool = True
    username: str = Field(index=True, description="The username from Casdoor")


class Session(SessionBase, table=True):
    id: UUID = Field(default=None, primary_key=True, index=True)

    topics: List["Topic"] = Relationship(back_populates="session", sa_relationship_kwargs={"lazy": "selectin"})


class SessionCreate(SessionBase):
    username: str


class SessionRead(SessionBase):
    id: UUID
    topics: List["TopicRead"] = []


class SessionUpdate(SQLModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None


TopicRead.model_rebuild()  # Rebuild to resolve forward references
