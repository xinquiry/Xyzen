from pydantic import BaseModel, Field


class LLMConfig(BaseModel):
    """
    LLM configuration for the default Azure OpenAI provider.
    Other LLM providers are managed through the database.
    """

    key: str = Field(default="", description="Azure OpenAI API Key")
    endpoint: str = Field(default="", description="Azure OpenAI API Endpoint")
    version: str = Field(default="2024-10-21", description="Azure OpenAI API Version")
    deployment: str = Field(default="gpt-4o", description="Default Azure OpenAI Deployment Name")

    @property
    def is_enabled(self) -> bool:
        """Check if the default Azure OpenAI provider is properly configured."""
        return bool(self.key and self.endpoint and self.deployment)
