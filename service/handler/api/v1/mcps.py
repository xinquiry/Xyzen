from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from middleware.database.connection import get_session
from models import McpServer

router = APIRouter()


@router.post("/mcps", response_model=McpServer)
async def create_mcp_server(
    *,
    session: AsyncSession = Depends(get_session),
    mcp_server: McpServer,
) -> McpServer:
    db_mcp_server = McpServer.model_validate(mcp_server)
    session.add(db_mcp_server)
    await session.commit()
    await session.refresh(db_mcp_server)
    return db_mcp_server


@router.get("/mcps", response_model=list[McpServer])
async def read_mcp_servers(
    *,
    session: AsyncSession = Depends(get_session),
    offset: int = 0,
    limit: int = 100,
) -> list[McpServer]:
    result = await session.exec(select(McpServer).offset(offset).limit(limit))
    mcp_servers = result.all()
    return list(mcp_servers)


@router.get("/mcps/{mcp_server_id}", response_model=McpServer)
async def read_mcp_server(*, session: AsyncSession = Depends(get_session), mcp_server_id: int) -> McpServer:
    mcp_server = await session.get(McpServer, mcp_server_id)
    if not mcp_server:
        raise HTTPException(status_code=404, detail="McpServer not found")
    return mcp_server


@router.patch("/mcps/{mcp_server_id}", response_model=McpServer)
async def update_mcp_server(
    *,
    session: AsyncSession = Depends(get_session),
    mcp_server_id: int,
    mcp_server: McpServer,
) -> McpServer:
    db_mcp_server = await session.get(McpServer, mcp_server_id)
    if not db_mcp_server:
        raise HTTPException(status_code=404, detail="McpServer not found")
    mcp_data = mcp_server.model_dump(exclude_unset=True)
    for key, value in mcp_data.items():
        setattr(db_mcp_server, key, value)
    session.add(db_mcp_server)
    await session.commit()
    await session.refresh(db_mcp_server)
    return db_mcp_server


@router.delete("/mcps/{mcp_server_id}")
async def delete_mcp_server(*, session: AsyncSession = Depends(get_session), mcp_server_id: int) -> dict[str, Any]:
    mcp_server = await session.get(McpServer, mcp_server_id)
    if not mcp_server:
        raise HTTPException(status_code=404, detail="McpServer not found")
    await session.delete(mcp_server)
    await session.commit()
    return {"ok": True}
