from pydantic import BaseModel, Field

from schemas.providers import ProviderType


class LLMConfig(BaseModel):
    """
    LLM configuration for the default Azure OpenAI provider.
    Other LLM providers are managed through the database.
    """

    provider: ProviderType = Field(default=ProviderType.AZURE_OPENAI, description="Default LLM Provider")
    key: str = Field(default="", description="LLM API Key")
    endpoint: str = Field(default="", description="LLM API Endpoint or base_url")
    version: str = Field(default="2024-10-21", description="LLM API Version")
    deployment: str = Field(default="gpt-4o", description="Default LLM Deployment Name")

    @property
    def is_enabled(self) -> bool:
        """Check if the default Azure OpenAI provider is properly configured."""
        return bool(self.key and self.endpoint and self.deployment)
