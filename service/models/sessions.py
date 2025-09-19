from typing import List, Optional
from uuid import UUID

from sqlmodel import Field, Relationship, SQLModel

from .agent import Agent
from .topic import Topic, TopicRead


class SessionBase(SQLModel):
    """
    Base model for sessions.
    """

    name: str
    description: str | None = None
    is_active: bool = True
    user_id: str = Field(index=True, description="The user ID")
    agent_id: UUID | None = Field(default=None, foreign_key="agent.id")


class Session(SessionBase, table=True):
    id: UUID = Field(default=None, primary_key=True, index=True)

    agent: Optional["Agent"] = Relationship(back_populates="session")
    topics: List["Topic"] = Relationship(back_populates="session", sa_relationship_kwargs={"lazy": "selectin"})


class SessionCreate(SQLModel):
    name: str
    description: str | None = None
    is_active: bool = True
    agent_id: UUID | None = None
    # user_id is intentionally omitted - it will be set from authentication


class SessionRead(SessionBase):
    id: UUID
    topics: List["TopicRead"] = []


class SessionUpdate(SQLModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None


TopicRead.model_rebuild()  # Rebuild to resolve forward references
Agent.model_rebuild()
