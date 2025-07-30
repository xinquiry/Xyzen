from fastapi import APIRouter

router = APIRouter(
    prefix="/chat",
)


@router.get("/")
async def root() -> dict[str, str]:
    return {"message": "Chat API is running"}
