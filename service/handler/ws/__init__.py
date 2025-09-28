from fastapi import APIRouter

from .v1 import ws_v1_router

ws_router = APIRouter(
    prefix="/xyzen-ws",
    tags=["WebSocket"],
)

ws_router.include_router(ws_v1_router)
