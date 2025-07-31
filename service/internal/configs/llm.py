from pydantic import BaseModel, Field


class LLMConfig(BaseModel):

    key: str = Field(default="", description="OpenAI API Key")
    endpoint: str = Field(default="", description="OpenAI API Endpoint")
    version: str = Field(default="2024-10-21", description="API Version")
    deployment: str = Field(default="gpt-4o", description="Deployment Name")

    @property
    def is_enabled(self) -> bool:
        return bool(self.key and self.endpoint and self.deployment)
