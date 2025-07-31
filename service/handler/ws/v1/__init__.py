from fastapi import APIRouter

from .chat import router as chat_router

v1_router = APIRouter(
    prefix="/v1",
    tags=["v1"],
)


@v1_router.get("/")
async def root() -> dict[str, str]:
    return {"message": "Welcome to the WebSocket v1"}


v1_router.include_router(chat_router, prefix="/chat", tags=["chat"])
