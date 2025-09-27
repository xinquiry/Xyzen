from fastapi import APIRouter

from handler.api.v1 import agents, mcps, topics

from .auth import router as auth_router
from .llm_providers import router as llm_providers_router
from .providers import router as providers_router
from .sessions import router as sessions_router

v1_router = APIRouter(
    prefix="/v1",
    tags=["v1"],
)


@v1_router.get("/")
async def root() -> dict[str, str]:
    return {"message": "Welcome to the API v1"}


v1_router.include_router(auth_router, prefix="/auth", tags=["auth"])
v1_router.include_router(llm_providers_router, tags=["llm_providers"])
v1_router.include_router(providers_router, prefix="/providers", tags=["providers"])
v1_router.include_router(sessions_router, prefix="/sessions", tags=["sessions"])
v1_router.include_router(mcps.router, prefix="/mcps", tags=["mcps"])
v1_router.include_router(topics.router, prefix="/topics", tags=["topics"])
v1_router.include_router(agents.router, prefix="/agents", tags=["agents"])
