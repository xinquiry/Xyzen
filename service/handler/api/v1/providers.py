from typing import List, Sequence

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from middleware.database.connection import get_session
from models.provider import Provider, ProviderCreate, ProviderUpdate

router = APIRouter()


@router.post("/", response_model=Provider)
async def create_provider(
    *,
    session: AsyncSession = Depends(get_session),
    provider: ProviderCreate,
) -> Provider:
    """
    Create a new provider.
    """
    db_provider = Provider.model_validate(provider)
    session.add(db_provider)
    await session.commit()
    await session.refresh(db_provider)
    return db_provider


@router.get("/", response_model=List[Provider])
async def read_providers(
    *,
    session: AsyncSession = Depends(get_session),
    offset: int = 0,
    limit: int = Query(default=100, le=100),
) -> Sequence[Provider]:
    """
    Read all providers with pagination.
    """
    providers = await session.exec(select(Provider).offset(offset).limit(limit))
    return providers.all()


@router.get("/{provider_id}", response_model=Provider)
async def read_provider(
    *,
    session: AsyncSession = Depends(get_session),
    provider_id: int,
) -> Provider:
    """
    Read a single provider by ID.
    """
    provider = await session.get(Provider, provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    return provider


@router.patch("/{provider_id}", response_model=Provider)
async def update_provider(
    *,
    session: AsyncSession = Depends(get_session),
    provider_id: int,
    provider: ProviderUpdate,
) -> Provider:
    """
    Update a provider.
    """
    db_provider = await session.get(Provider, provider_id)
    if not db_provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    provider_data = provider.model_dump(exclude_unset=True)
    for key, value in provider_data.items():
        setattr(db_provider, key, value)

    session.add(db_provider)
    await session.commit()
    await session.refresh(db_provider)
    return db_provider


@router.delete("/{provider_id}")
async def delete_provider(
    *,
    session: AsyncSession = Depends(get_session),
    provider_id: int,
) -> dict[str, bool]:
    """
    Delete a provider.
    """
    provider = await session.get(Provider, provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    await session.delete(provider)
    await session.commit()
    return {"ok": True}
