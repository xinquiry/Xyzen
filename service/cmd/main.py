from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import anyio
import uvicorn
from fastapi import FastAPI
from fastmcp.server.http import StreamableHTTPSessionManager
from starlette.routing import Mount
from starlette.types import Receive, Scope, Send

from handler.mcp import lab_mcp, other_mcp

# TODO: 自动化 MCP Server 发现并自动挂载到 FastAPI 主路由
# 创建会话管理器
lab_session_manager = StreamableHTTPSessionManager(
    app=lab_mcp._mcp_server,
    event_store=None,
    json_response=False,
    stateless=False,
)

other_session_manager = StreamableHTTPSessionManager(
    app=other_mcp._mcp_server,
    event_store=None,
    json_response=False,
    stateless=False,
)


# ASGI 处理器
async def handle_lab_asgi(scope: Scope, receive: Receive, send: Send) -> None:
    await lab_session_manager.handle_request(scope, receive, send)


async def handle_other_asgi(scope: Scope, receive: Receive, send: Send) -> None:
    await other_session_manager.handle_request(scope, receive, send)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    async with lab_session_manager.run(), other_session_manager.run():
        yield


app = FastAPI(
    title="Xyzen Service - Optimized",
    description="FastAPI + MCP integrated service",
    version="0.1.0",
    lifespan=lifespan,
)

# 使用 Mount 但直接挂载 ASGI 处理器（最优性能）
app.router.routes.extend(
    [
        Mount("/mcp/lab", handle_lab_asgi),
        Mount("/mcp/other", handle_other_asgi),
    ]
)


if __name__ == "__main__":
    config = uvicorn.Config(app, host="127.0.0.1", port=48200)
    server = uvicorn.Server(config)
    anyio.run(server.serve)
