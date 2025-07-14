# This file provides a simple FastAPI application that integrates multiple MCP servers with unified server
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any, MutableMapping

import anyio
import uvicorn
from fastapi import FastAPI, Request, Response
from fastmcp import FastMCP
from fastmcp.server.http import StreamableHTTPSessionManager
from starlette.types import Receive, Scope

# 创建 MCP 服务器
lab_mcp: FastMCP = FastMCP("Lab 🚀")
other_mcp: FastMCP = FastMCP("Other Tools 🛠️")


@lab_mcp.tool
def multiply(a: float, b: float) -> float:
    """Multiplies two numbers."""
    return a * b


@other_mcp.tool
def add(a: float, b: float) -> float:
    """Adds two numbers."""
    return a + b


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


# 生命周期管理 - 只需要管理会话管理器
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # 启动会话管理器
    async with lab_session_manager.run(), other_session_manager.run():
        yield


# 创建 FastAPI 应用
app = FastAPI(
    title="Xyzen Service",
    description="FastAPI + MCP integrated service",
    version="0.1.0",
    lifespan=lifespan,
)


# 直接添加 MCP 处理路由
async def handle_lab_mcp(request: Request) -> Response:
    """处理 Lab MCP 请求"""
    scope: Scope = request.scope
    receive: Receive = request.receive

    # 创建一个简单的 send 函数来捕获响应
    response_started = False
    status_code = 200
    headers: list[tuple[bytes, bytes]] = []
    body_parts: list[bytes] = []

    async def send(message: MutableMapping[str, Any]) -> None:
        nonlocal response_started, status_code, headers

        if message["type"] == "http.response.start":
            response_started = True
            status_code = message["status"]
            headers = message.get("headers", [])
        elif message["type"] == "http.response.body":
            body_parts.append(message.get("body", b""))

    # 调用会话管理器处理请求
    await lab_session_manager.handle_request(scope, receive, send)

    # 构建响应
    body = b"".join(body_parts)
    response_headers = {key.decode(): value.decode() for key, value in headers}

    return Response(
        content=body,
        status_code=status_code,
        headers=response_headers,
    )


async def handle_other_mcp(request: Request) -> Response:
    """处理 Other MCP 请求"""
    scope: Scope = request.scope
    receive: Receive = request.receive

    response_started = False
    status_code = 200
    headers: list[tuple[bytes, bytes]] = []
    body_parts: list[bytes] = []

    async def send(message: MutableMapping[str, Any]) -> None:
        nonlocal response_started, status_code, headers

        if message["type"] == "http.response.start":
            response_started = True
            status_code = message["status"]
            headers = message.get("headers", [])
        elif message["type"] == "http.response.body":
            body_parts.append(message.get("body", b""))

    await other_session_manager.handle_request(scope, receive, send)

    body = b"".join(body_parts)
    response_headers = {key.decode(): value.decode() for key, value in headers}

    return Response(
        content=body,
        status_code=status_code,
        headers=response_headers,
    )


# 添加 MCP 路由
app.add_api_route("/mcp/lab/{path:path}", handle_lab_mcp, methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
app.add_api_route("/mcp/other/{path:path}", handle_other_mcp, methods=["GET", "POST", "PUT", "DELETE", "PATCH"])


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "Xyzen Service with FastAPI and MCP"}


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "healthy", "service": "xyzen"}


@app.get("/mcp/status")
async def mcp_status() -> dict[str, Any]:
    return {
        "lab_tools": "http://127.0.0.1:48200/mcp/lab/",
        "other_tools": "http://127.0.0.1:48200/mcp/other/",
        "available_tools": {"lab": ["multiply"], "other": ["add"]},
    }


config_kwargs: dict[str, Any] = {
    "timeout_graceful_shutdown": 0,
    "lifespan": "on",
}

config = uvicorn.Config(app, host="127.0.0.1", port=48200, **config_kwargs)
server = uvicorn.Server(config)

if __name__ == "__main__":
    anyio.run(server.serve)
