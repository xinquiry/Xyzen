from fastapi import APIRouter

from . import chat
from .providers import router as providers_router

v1_router = APIRouter(
    prefix="/v1",
    tags=["v1"],
)


@v1_router.get("/")
async def root() -> dict[str, str]:
    return {"message": "Welcome to the API v1"}


v1_router.include_router(chat.router, prefix="/chat", tags=["chat"])
v1_router.include_router(providers_router, prefix="/providers", tags=["providers"])
