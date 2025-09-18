import datetime
from typing import TYPE_CHECKING, Any, Dict, List, Optional
from uuid import UUID, uuid4

from sqlmodel import JSON, Column, Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .agent import Agent

from .links import AgentMcpServerLink


class MCPServerBase(SQLModel):

    user: Optional[UUID] = Field(default=None, index=True)
    name: str = Field(index=True)
    description: Optional[str] = Field(default=None)
    url: str
    token: str
    status: str = Field(default="unknown", index=True)
    tools: Optional[List[Dict[str, Any]]] = Field(default=None, sa_column=Column(JSON))
    last_checked_at: Optional[datetime.datetime] = Field(default=None)


class McpServer(MCPServerBase, table=True):
    id: UUID = Field(default_factory=uuid4, index=True, primary_key=True)

    agents: List["Agent"] = Relationship(back_populates="mcp_servers", link_model=AgentMcpServerLink)
