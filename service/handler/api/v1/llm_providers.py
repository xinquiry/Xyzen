"""
LLM Provider CRUD API endpoints.
Provides REST API for managing LLM providers stored in the database.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from core.providers import ProviderType, provider_manager
from middleware.database.connection import get_session
from models.providers import Provider, ProviderCreate, ProviderUpdate

router = APIRouter(prefix="/api/v1/llm-providers", tags=["LLM Providers"])


class LLMProviderResponse(BaseModel):
    """Response model for LLM provider with runtime status."""

    id: int
    Name: str
    Api: str
    Model: Optional[str] = None
    MaxTokens: int
    Temperature: float
    Timeout: int
    # Runtime status from provider manager
    is_active: bool = False
    is_available: bool = False
    provider_type: str


class ProviderSwitchRequest(BaseModel):
    """Request model for switching active provider."""

    provider_id: int


@router.get("/", response_model=List[LLMProviderResponse])
async def list_providers(session: Session = Depends(get_session)) -> List[LLMProviderResponse]:
    """
    List all LLM providers with their runtime status.
    """
    providers = session.exec(select(Provider)).all()
    active_provider = provider_manager.get_active_provider()
    active_provider_name = active_provider.provider_name if active_provider else None

    result = []
    for provider in providers:
        # Get runtime status from provider manager
        provider_key = f"db_{provider.Name.lower()}_{provider.id}"
        runtime_provider = provider_manager.get_provider(provider_key)

        result.append(
            LLMProviderResponse(
                id=provider.id or 0,
                Name=provider.Name,
                Api=provider.Api,
                Model=provider.Model,
                MaxTokens=provider.MaxTokens,
                Temperature=provider.Temperature,
                Timeout=provider.Timeout,
                is_active=bool(runtime_provider and runtime_provider == active_provider),
                is_available=bool(runtime_provider and runtime_provider.is_available()),
                provider_type=_map_provider_type(provider.Name),
            )
        )

    return result


@router.post("/", response_model=LLMProviderResponse)
async def create_provider(
    provider_data: ProviderCreate, session: Session = Depends(get_session)
) -> LLMProviderResponse:
    """
    Create a new LLM provider.
    """
    # Check if provider name already exists
    existing = session.exec(select(Provider).where(Provider.Name == provider_data.Name)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=f"Provider with name '{provider_data.Name}' already exists"
        )

    # Create provider in database
    db_provider = Provider.model_validate(provider_data)
    session.add(db_provider)
    session.commit()
    session.refresh(db_provider)

    # Add to runtime provider manager
    try:
        provider_type = _map_provider_type(db_provider.Name)
        provider_key = f"db_{db_provider.Name.lower()}_{db_provider.id}"

        provider_manager.add_provider(
            name=provider_key,
            provider_type=provider_type,
            api_key=db_provider.Key,
            base_url=db_provider.Api,
            default_model=db_provider.Model or "gpt-4o",
            max_tokens=db_provider.MaxTokens,
            temperature=db_provider.Temperature,
            timeout=db_provider.Timeout,
        )
    except Exception as e:
        # Rollback database changes if provider manager fails
        session.delete(db_provider)
        session.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to initialize provider: {e}"
        )

    runtime_provider = provider_manager.get_provider(provider_key)

    return LLMProviderResponse(
        id=db_provider.id or 0,
        Name=db_provider.Name,
        Api=db_provider.Api,
        Model=db_provider.Model,
        MaxTokens=db_provider.MaxTokens,
        Temperature=db_provider.Temperature,
        Timeout=db_provider.Timeout,
        is_active=False,
        is_available=runtime_provider.is_available() if runtime_provider else False,
        provider_type=provider_type,
    )


@router.get("/{provider_id}", response_model=LLMProviderResponse)
async def get_provider(provider_id: int, session: Session = Depends(get_session)) -> LLMProviderResponse:
    """
    Get a specific LLM provider by ID.
    """
    provider = session.get(Provider, provider_id)
    if not provider:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")

    # Get runtime status
    provider_key = f"db_{provider.Name.lower()}_{provider.id}"
    runtime_provider = provider_manager.get_provider(provider_key)
    active_provider = provider_manager.get_active_provider()

    return LLMProviderResponse(
        id=provider.id or 0,
        Name=provider.Name,
        Api=provider.Api,
        Model=provider.Model,
        MaxTokens=provider.MaxTokens,
        Temperature=provider.Temperature,
        Timeout=provider.Timeout,
        is_active=bool(runtime_provider and runtime_provider == active_provider),
        is_available=bool(runtime_provider and runtime_provider.is_available()),
        provider_type=_map_provider_type(provider.Name),
    )


@router.put("/{provider_id}", response_model=LLMProviderResponse)
async def update_provider(
    provider_id: int, provider_data: ProviderUpdate, session: Session = Depends(get_session)
) -> LLMProviderResponse:
    """
    Update an existing LLM provider.
    """
    provider = session.get(Provider, provider_id)
    if not provider:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")

    # Check if changing name would conflict
    if provider_data.Name != provider.Name:
        existing = session.exec(select(Provider).where(Provider.Name == provider_data.Name)).first()
        if existing and existing.id != provider_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Provider with name '{provider_data.Name}' already exists",
            )

    # Remove old provider from manager
    old_provider_key = f"db_{provider.Name.lower()}_{provider.id}"
    try:
        provider_manager.remove_provider(old_provider_key)
    except ValueError:
        pass  # Provider wasn't in manager, that's fine

    # Update database record
    update_data = provider_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(provider, field, value)

    session.commit()
    session.refresh(provider)

    # Add updated provider to manager
    try:
        provider_type = _map_provider_type(provider.Name)
        new_provider_key = f"db_{provider.Name.lower()}_{provider.id}"

        provider_manager.add_provider(
            name=new_provider_key,
            provider_type=provider_type,
            api_key=provider.Key,
            base_url=provider.Api,
            default_model=provider.Model or "gpt-4o",
            max_tokens=provider.MaxTokens,
            temperature=provider.Temperature,
            timeout=provider.Timeout,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to update provider: {e}"
        )

    runtime_provider = provider_manager.get_provider(new_provider_key)
    active_provider = provider_manager.get_active_provider()

    return LLMProviderResponse(
        id=provider.id or 0,
        Name=provider.Name,
        Api=provider.Api,
        Model=provider.Model,
        MaxTokens=provider.MaxTokens,
        Temperature=provider.Temperature,
        Timeout=provider.Timeout,
        is_active=bool(runtime_provider and runtime_provider == active_provider),
        is_available=bool(runtime_provider and runtime_provider.is_available()),
        provider_type=provider_type,
    )


@router.delete("/{provider_id}")
async def delete_provider(provider_id: int, session: Session = Depends(get_session)) -> dict:
    """
    Delete an LLM provider.
    """
    provider = session.get(Provider, provider_id)
    if not provider:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")

    # Remove from provider manager
    provider_key = f"db_{provider.Name.lower()}_{provider.id}"
    try:
        provider_manager.remove_provider(provider_key)
    except ValueError:
        pass  # Provider wasn't in manager, that's fine

    # Delete from database
    session.delete(provider)
    session.commit()

    return {"message": "Provider deleted successfully"}


@router.post("/switch")
async def switch_active_provider(request: ProviderSwitchRequest, session: Session = Depends(get_session)) -> dict:
    """
    Switch the active LLM provider.
    """
    provider = session.get(Provider, request.provider_id)
    if not provider:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")

    provider_key = f"db_{provider.Name.lower()}_{provider.id}"
    try:
        provider_manager.set_active_provider(provider_key)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Provider is not available in the runtime manager"
        )

    return {"message": f"Switched to provider '{provider.Name}'"}


@router.get("/supported-types/", response_model=List[str])
async def get_supported_provider_types() -> List[str]:
    """
    Get a list of supported LLM provider types.
    """
    return [provider_type.value for provider_type in ProviderType]


def _map_provider_type(provider_name: str) -> str:
    """
    Map provider name to provider type.
    """
    name_lower = provider_name.lower()
    if "azure" in name_lower:
        return "azure_openai"
    elif "anthropic" in name_lower or "claude" in name_lower:
        return "anthropic"
    else:
        return "openai"
