from fastapi import APIRouter

from .agents import router as agents_router
from .auth import router as auth_router
from .mcps import router as mcps_router
from .providers import router as providers_router
from .sessions import router as sessions_router
from .topics import router as topics_router

v1_router = APIRouter(
    prefix="/v1",
    tags=["v1"],
)


@v1_router.get("/")
async def root() -> dict[str, str]:
    return {"message": "Welcome to the API v1"}


v1_router.include_router(auth_router, prefix="/auth", tags=["auth"])
v1_router.include_router(providers_router, prefix="/providers", tags=["providers"])
v1_router.include_router(sessions_router, prefix="/sessions", tags=["sessions"])
v1_router.include_router(topics_router, prefix="/topics", tags=["topics"])
v1_router.include_router(agents_router, prefix="/agents", tags=["agents"])
v1_router.include_router(mcps_router, prefix="/mcps", tags=["mcps"])
