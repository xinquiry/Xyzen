from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

import anyio
import uvicorn
from fastapi import FastAPI
from fastmcp import FastMCP
from fastmcp.server.http import StarletteWithLifespan

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


lab_mcp_app: StarletteWithLifespan = lab_mcp.http_app(transport="streamable-http", path="/")
other_mcp_app: StarletteWithLifespan = other_mcp.http_app(transport="streamable-http", path="/")


# 关键：使用 mcp_app 的生命周期管理器
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # 使用 mcp_app 的生命周期
    async with lab_mcp_app.lifespan(lab_mcp_app), other_mcp_app.lifespan(other_mcp_app):
        yield


# 创建 FastAPI 应用并传入 MCP 的生命周期
app = FastAPI(
    title="Xyzen Service",
    description="FastAPI + MCP integrated service",
    version="0.1.0",
    lifespan=lifespan,
)

# 挂载 MCP 应用
app.mount("/mcp/lab", lab_mcp_app)
app.mount("/mcp/other", other_mcp_app)


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
