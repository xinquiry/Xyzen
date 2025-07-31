from openai import AzureOpenAI

from internal import configs


def get_client() -> AzureOpenAI | None:
    """
    Initializes and returns the Azure OpenAI client if configured.
    """
    if not configs.LLM.is_enabled:
        return None

    return AzureOpenAI(
        api_key=configs.LLM.key,
        api_version=configs.LLM.version,
        azure_endpoint=configs.LLM.endpoint,
    )
