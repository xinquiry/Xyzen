from fastapi import APIRouter

from .api import api_router
from .api.proxy import router as proxy_router
from .ws import ws_router

# Create a single root router to include all other routers
# Don't add tags here to avoid duplication in docs
root_router = APIRouter(prefix="/xyzen")

root_router.include_router(api_router)
root_router.include_router(ws_router)

# Include proxy router directly under /xyzen (not under /xyzen/api)
# This makes it accessible at /xyzen/api/bohrium/v1/... and /xyzen/api/openapi/v1/...
root_router.include_router(proxy_router)
