from typing import List, Optional, Sequence
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import selectinload
from sqlmodel import col, select
from sqlmodel.ext.asyncio.session import AsyncSession

from middleware.auth import get_auth_provider, is_auth_configured
from middleware.database import get_session
from models.agent import Agent, AgentCreate, AgentRead, AgentUpdate
from models.mcp import McpServer


async def get_current_user(authorization: Optional[str] = Header(None)) -> str:
    """从 Authorization header 中获取当前用户ID"""

    # 检查认证服务是否配置
    if not is_auth_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Authentication service is not configured"
        )

    # 检查 Authorization header
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authorization header")

    # 解析 Bearer token
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization header format")

    access_token = authorization[7:]  # Remove "Bearer " prefix

    # 获取认证提供商并验证 token
    provider = get_auth_provider()
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Authentication provider initialization failed"
        )

    auth_result = provider.validate_token(access_token)
    if not auth_result.success or not auth_result.user_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=auth_result.error_message or "Token validation failed",
        )

    return auth_result.user_info.id


router = APIRouter()


@router.post("/", response_model=AgentRead)
async def create_agent(
    agent: AgentCreate, db: AsyncSession = Depends(get_session), current_user_id: str = Depends(get_current_user)
) -> Agent:
    mcp_server_ids = agent.mcp_server_ids
    del agent.mcp_server_ids

    # 创建 agent 数据，设置真实的用户ID
    agent_data = agent.model_dump(exclude={"mcp_server_ids"})
    agent_data["user_id"] = current_user_id
    db_agent = Agent.model_validate(agent_data)

    if mcp_server_ids:
        mcp_result = await db.exec(select(McpServer).where(col(McpServer.id).in_(mcp_server_ids)))
        mcp_servers = mcp_result.all()
        db_agent.mcp_servers = list(mcp_servers)

    db.add(db_agent)
    await db.commit()
    await db.refresh(db_agent)
    return db_agent


@router.get("/", response_model=List[AgentRead])
async def get_agents(
    db: AsyncSession = Depends(get_session), current_user_id: str = Depends(get_current_user)
) -> Sequence[Agent]:
    # 只返回当前用户的 agents
    statement = (
        select(Agent).where(Agent.user_id == current_user_id).options(selectinload(getattr(Agent, "mcp_servers")))
    )
    result = await db.exec(statement)
    agents = result.all()
    return agents


@router.get("/{agent_id}", response_model=AgentRead)
async def get_agent(
    agent_id: UUID, db: AsyncSession = Depends(get_session), current_user_id: str = Depends(get_current_user)
) -> Agent:
    # 只能获取当前用户的 agent
    statement = (
        select(Agent)
        .where(Agent.id == agent_id, Agent.user_id == current_user_id)
        .options(selectinload(getattr(Agent, "mcp_servers")))
    )
    result = await db.exec(statement)
    agent = result.one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.patch("/{agent_id}", response_model=AgentRead)
async def update_agent(
    agent_id: UUID,
    agent: AgentUpdate,
    db: AsyncSession = Depends(get_session),
    current_user_id: str = Depends(get_current_user),
) -> Agent:
    # 只能更新当前用户的 agent
    statement = select(Agent).where(Agent.id == agent_id, Agent.user_id == current_user_id)
    result = await db.exec(statement)
    db_agent = result.one_or_none()
    if not db_agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    agent_data = agent.model_dump(exclude_unset=True)

    if "mcp_server_ids" in agent_data:
        mcp_server_ids = agent_data.pop("mcp_server_ids")
        if mcp_server_ids:
            mcp_result = await db.exec(select(McpServer).where(col(McpServer.id).in_(mcp_server_ids)))
            mcp_servers = mcp_result.all()
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
async def delete_agent(
    agent_id: UUID, db: AsyncSession = Depends(get_session), current_user_id: str = Depends(get_current_user)
) -> dict:
    # 只能删除当前用户的 agent
    statement = select(Agent).where(Agent.id == agent_id, Agent.user_id == current_user_id)
    result = await db.exec(statement)
    agent = result.one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    await db.delete(agent)
    await db.commit()
    return {"ok": True}
