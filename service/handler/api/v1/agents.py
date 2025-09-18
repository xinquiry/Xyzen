from typing import List, Sequence
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import selectinload
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from middleware.database import get_session
from models.agent import Agent, AgentCreate, AgentRead, AgentUpdate
from models.mcp import McpServer

router = APIRouter()


@router.post("/", response_model=AgentRead)
async def create_agent(agent: AgentCreate, db: AsyncSession = Depends(get_session)) -> Agent:
    mcp_server_ids = agent.mcp_server_ids
    del agent.mcp_server_ids

    db_agent = Agent.model_validate(agent)

    if mcp_server_ids:
        result = await db.exec(select(McpServer).where(getattr(McpServer, "id").in_(mcp_server_ids)))
        mcp_servers = result.all()
        db_agent.mcp_servers = list(mcp_servers)

    db.add(db_agent)
    await db.commit()
    await db.refresh(db_agent)
    return db_agent


@router.get("/", response_model=List[AgentRead])
async def get_agents(db: AsyncSession = Depends(get_session)) -> Sequence[Agent]:
    # TODO: Filter agents by the current user.
    statement = select(Agent).options(selectinload(getattr(Agent, "mcp_servers")))
    result = await db.exec(statement)
    agents = result.all()
    return agents


@router.get("/{agent_id}", response_model=AgentRead)
async def get_agent(agent_id: UUID, db: AsyncSession = Depends(get_session)) -> Agent:
    # TODO: Filter agents by the current user.
    statement = select(Agent).where(Agent.id == agent_id).options(selectinload(getattr(Agent, "mcp_servers")))
    result = await db.exec(statement)
    agent = result.one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.patch("/{agent_id}", response_model=AgentRead)
async def update_agent(agent_id: UUID, agent: AgentUpdate, db: AsyncSession = Depends(get_session)) -> Agent:
    db_agent = await db.get(Agent, agent_id)
    if not db_agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    agent_data = agent.model_dump(exclude_unset=True)

    if "mcp_server_ids" in agent_data:
        mcp_server_ids = agent_data.pop("mcp_server_ids")
        if mcp_server_ids:
            result = await db.exec(select(McpServer).where(getattr(McpServer, "id").in_(mcp_server_ids)))
            mcp_servers = result.all()
            db_agent.mcp_servers = list(mcp_servers)
        else:
            db_agent.mcp_servers = []

    for key, value in agent_data.items():
        setattr(db_agent, key, value)

    db.add(db_agent)
    await db.commit()
    await db.refresh(db_agent)
    return db_agent


@router.delete("/{agent_id}")
async def delete_agent(agent_id: UUID, db: AsyncSession = Depends(get_session)) -> dict:
    # TODO: Filter agents by the current user.
    agent = await db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    await db.delete(agent)
    await db.commit()
    return {"ok": True}
