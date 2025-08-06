import datetime
from typing import Any, Dict, List, Optional

from sqlmodel import JSON, Column, Field, SQLModel


class McpServer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    description: Optional[str] = Field(default=None)
    url: str
    token: str
    user_id: Optional[str] = Field(default=None, index=True)
    status: str = Field(default="unknown", index=True)
    tools: Optional[List[Dict[str, Any]]] = Field(default=None, sa_column=Column(JSON))
    last_checked_at: Optional[datetime.datetime] = Field(default=None)
