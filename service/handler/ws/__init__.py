from fastapi import APIRouter

from .v1 import v1_router

ws_router = APIRouter(
    prefix="/ws",
    tags=["WebSocket"],
)

ws_router.include_router(v1_router)
