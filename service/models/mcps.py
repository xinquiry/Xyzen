from typing import Optional

from sqlmodel import Field, SQLModel


class McpServer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    description: Optional[str] = Field(default=None)
    url: str
    token: str
    user_id: Optional[str] = Field(default=None, index=True)
