from typing import Any
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from core.mcp import check_mcp_server_status
from middleware.database.connection import get_session
from models import McpServer

from .sessions import get_current_user

router = APIRouter()


@router.post("/mcps", response_model=McpServer)
async def create_mcp_server(
    *,
    session: AsyncSession = Depends(get_session),
    user: str = Depends(get_current_user),
    background_tasks: BackgroundTasks,
    mcp_server: McpServer,
) -> McpServer:
    # Set the user_id from authenticated user
    mcp_server.user_id = user

    db_mcp_server = McpServer.model_validate(mcp_server)
    session.add(db_mcp_server)
    await session.commit()
    await session.refresh(db_mcp_server)

    if db_mcp_server.id:
        background_tasks.add_task(check_mcp_server_status, db_mcp_server.id)

    return db_mcp_server


@router.get("/mcps", response_model=list[McpServer])
async def read_mcp_servers(
    *,
    session: AsyncSession = Depends(get_session),
    user: str = Depends(get_current_user),
    offset: int = 0,
    limit: int = 100,
) -> list[McpServer]:
    # Filter MCP servers by current user
    statement = select(McpServer).where(McpServer.user_id == user).offset(offset).limit(limit)
    result = await session.exec(statement)
    mcp_servers = result.all()
    return list(mcp_servers)


@router.get("/mcps/{mcp_server_id}", response_model=McpServer)
async def read_mcp_server(
    *, session: AsyncSession = Depends(get_session), user: str = Depends(get_current_user), mcp_server_id: UUID
) -> McpServer:
    mcp_server = await session.get(McpServer, mcp_server_id)
    if not mcp_server:
        raise HTTPException(status_code=404, detail="McpServer not found")

    # Check if the MCP server belongs to the current user
    if mcp_server.user_id != user:
        raise HTTPException(
            status_code=403, detail="Access denied: You don't have permission to access this MCP server"
        )

    return mcp_server


@router.patch("/mcps/{mcp_server_id}", response_model=McpServer)
async def update_mcp_server(
    *,
    session: AsyncSession = Depends(get_session),
    user: str = Depends(get_current_user),
    mcp_server_id: UUID,
    mcp_server: McpServer,
) -> McpServer:
    db_mcp_server = await session.get(McpServer, mcp_server_id)
    if not db_mcp_server:
        raise HTTPException(status_code=404, detail="McpServer not found")

    # Check if the MCP server belongs to the current user
    if db_mcp_server.user_id != user:
        raise HTTPException(
            status_code=403, detail="Access denied: You don't have permission to modify this MCP server"
        )

    mcp_data = mcp_server.model_dump(exclude_unset=True)
    # Don't allow user_id to be changed
    mcp_data.pop("user_id", None)

    for key, value in mcp_data.items():
        setattr(db_mcp_server, key, value)

    session.add(db_mcp_server)
    await session.commit()
    await session.refresh(db_mcp_server)
    return db_mcp_server


@router.delete("/mcps/{mcp_server_id}")
async def delete_mcp_server(
    *, session: AsyncSession = Depends(get_session), user: str = Depends(get_current_user), mcp_server_id: UUID
) -> dict[str, Any]:
    mcp_server = await session.get(McpServer, mcp_server_id)
    if not mcp_server:
        raise HTTPException(status_code=404, detail="McpServer not found")

    # Check if the MCP server belongs to the current user
    if mcp_server.user_id != user:
        raise HTTPException(
            status_code=403, detail="Access denied: You don't have permission to delete this MCP server"
        )

    await session.delete(mcp_server)
    await session.commit()
    return {"ok": True}
