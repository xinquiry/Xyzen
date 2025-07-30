from fastapi import APIRouter

from .base import v1_router

# 创建一个统一的 API 路由器
api_router = APIRouter(prefix="/api", tags=["api"])


api_router.include_router(
    v1_router,
)


@api_router.get("/health")
async def health_check() -> dict[str, str]:
    """
    Health check endpoint to verify the service is running.
    """
    return {"status": "ok", "message": "Service is running"}
