from typing import Optional
from uuid import UUID

from sqlmodel import Field, SQLModel


class AgentMcpServerLink(SQLModel, table=True):
    agent_id: Optional[UUID] = Field(default=None, foreign_key="agent.id", primary_key=True)
    mcp_server_id: Optional[int] = Field(default=None, foreign_key="mcpserver.id", primary_key=True)
