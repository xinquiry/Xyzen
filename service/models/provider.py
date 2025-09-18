from typing import ClassVar, Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class ProviderBase(SQLModel):
    """Base model for a provider with required fields for creation."""

    user: UUID = Field(index=True)
    name: str = Field(index=True)
    api: str
    key: str
    timeout: int = 10
    model: Optional[str] = None
    max_tokens: int = 4096
    temperature: float = 0.7


class Provider(ProviderBase, table=True):
    """Database model for a provider, inherits from ProviderBase."""

    __tablename__: ClassVar[str] = "provider"

    id: UUID = Field(default_factory=uuid4, index=True, primary_key=True)


class ProviderRead(ProviderBase):
    """Model for reading a provider, includes the ID."""

    id: UUID


class ProviderCreate(Provider):
    """Model for creating a provider."""

    pass


class ProviderUpdate(Provider):
    """Model for updating a provider. All fields are optional."""

    pass
