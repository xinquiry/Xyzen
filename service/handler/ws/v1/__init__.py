from fastapi import APIRouter

from .chat import router as chat_router
from .mcp import router as mcp_router

ws_v1_router = APIRouter(
    prefix="/v1",
    tags=["v1"],
)


@ws_v1_router.get("/")
async def root() -> dict[str, str]:
    return {"message": "Welcome to the WebSocket v1"}


ws_v1_router.include_router(chat_router, prefix="/chat", tags=["Chat"])
ws_v1_router.include_router(
    mcp_router,
    prefix="/mcp",
    tags=["MCP Updates"],
)
