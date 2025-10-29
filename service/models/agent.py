from uuid import UUID, uuid4

from sqlmodel import JSON, Column, Field, SQLModel
from datetime import datetime, timezone
from sqlalchemy import TIMESTAMP

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .mcp import McpServer


class AgentCreateBase(SQLModel):
    name: str
    description: str | None = None
    avatar: str | None = None
    tags: list[str] | None = Field(default=None, sa_column=Column(JSON))
    model: str | None = None
    temperature: float | None = None
    prompt: str | None = None
    user_id: str = Field(index=True)
    require_tool_confirmation: bool = Field(default=False)
    provider_id: UUID | None = Field(default=None, index=True)


class AgentBase(AgentCreateBase):
    user_id: str = Field(index=True)


datetime.utcnow


class Agent(AgentBase, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(TIMESTAMP(timezone=True), nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(TIMESTAMP(timezone=True), nullable=False, onupdate=lambda: datetime.now(timezone.utc)),
    )


class AgentCreate(AgentCreateBase):
    mcp_server_ids: list[UUID] = []


class AgentRead(AgentBase):
    id: UUID
    updated_at: datetime


class AgentReadWithDetails(AgentRead):
    mcp_servers: list["McpServer"] = []


class AgentUpdate(SQLModel):
    name: str | None = None
    description: str | None = None
    avatar: str | None = None
    tags: list[str] | None = None
    model: str | None = None
    temperature: float | None = None
    prompt: str | None = None
    require_tool_confirmation: bool | None = None
    provider_id: UUID | None = None
    mcp_server_ids: list[UUID] | None = None
