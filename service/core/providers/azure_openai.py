"""
Azure OpenAI LLM Provider implementation.
Dedicated provider for Azure OpenAI (separate from standard OpenAI).
"""

import logging
from typing import Any, AsyncGenerator, List, Literal, Optional, cast

from openai import AsyncAzureOpenAI
from openai.types.chat import ChatCompletionMessageParam
from openai.types.chat.chat_completion_tool_param import ChatCompletionToolParam

from .base import (
    BaseLLMProvider,
    ChatCompletionRequest,
    ChatCompletionResponse,
    ChatCompletionStreamChunk,
)

logger = logging.getLogger(__name__)


class AzureOpenAIProvider(BaseLLMProvider):
    """
    Azure OpenAI provider implementation using AzureOpenAI SDK client.
    """

    def __init__(
        self,
        api_key: str,
        api_endpoint: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        timeout: int = 60,
        api_version: str = "2024-10-21",
        **kwargs: Any,
    ) -> None:
        """
        Initialize the Azure OpenAI provider.

        Args:
            api_key: The API key for authentication
            api_endpoint: Azure endpoint URL
            model: The deployment name (model name in Azure)
            max_tokens: Maximum tokens for responses
            temperature: Sampling temperature
            timeout: Request timeout in seconds
            api_version: Azure OpenAI API version
            **kwargs: Additional configuration
        """
        super().__init__(
            api_key=api_key,
            api_endpoint=api_endpoint,
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
            timeout=timeout,
            **kwargs,
        )
        self.api_version = api_version

        if not self.api_endpoint:
            raise ValueError("Azure OpenAI requires api_endpoint to be provided")

        # Initialize Azure OpenAI client
        self.client: AsyncAzureOpenAI = AsyncAzureOpenAI(
            api_key=self.api_key,
            api_version=self.api_version,
            azure_endpoint=self.api_endpoint,
            timeout=self.timeout,
        )

        # Mark as supporting streaming
        self._streaming_supported = True

    async def chat_completion(self, request: ChatCompletionRequest) -> ChatCompletionResponse:
        """
        Generate a chat completion using Azure OpenAI API.

        Args:
            request: The chat completion request

        Returns:
            The chat completion response
        """
        try:
            # Validate model (deployment name on Azure)
            if request.model not in self.supported_models:
                logger.warning(f"Model {request.model} is not in the supported models list for {self.provider_name}")
                # Let API decide if model/deployment is valid

            # Convert standardized messages to OpenAI format
            messages = []
            for i, msg in enumerate(request.messages):
                if msg.role == "tool":
                    prev_msg = request.messages[i - 1] if i > 0 else None
                    has_tool_calls = (
                        prev_msg and hasattr(prev_msg, "tool_calls") and getattr(prev_msg, "tool_calls", None)
                    )
                    if has_tool_calls:
                        message_dict = {
                            "role": "user",
                            "content": f"Tool execution result: {msg.content}",
                        }
                    else:
                        message_dict = {
                            "role": "user",
                            "content": f"Tool result: {msg.content}",
                        }
                else:
                    message_dict = {"role": msg.role, "content": msg.content}
                messages.append(message_dict)

            # Prepare API parameters
            api_params = {
                "model": request.model,
                "messages": messages,
                "temperature": request.temperature,
            }

            if request.max_tokens:
                api_params["max_tokens"] = request.max_tokens

            # Handle tools
            if request.tools:
                tools: List[ChatCompletionToolParam] = []
                for tool in request.tools:
                    openai_tool: ChatCompletionToolParam = {
                        "type": "function",
                        "function": {
                            "name": tool.get("name", ""),
                            "description": tool.get("description", ""),
                            "parameters": tool.get("parameters", {}),
                        },
                    }
                    tools.append(openai_tool)

                api_params["tools"] = tools
                if request.tool_choice:
                    api_params["tool_choice"] = request.tool_choice

            # Make the API call
            max_tokens_value = api_params.get("max_tokens")
            max_tokens = cast(int, max_tokens_value) if max_tokens_value is not None else None
            model_temperature = cast(float, api_params["temperature"])
            try:
                if "tools" in api_params and api_params["tools"] is not None:
                    tools = cast(List[ChatCompletionToolParam], api_params["tools"])
                    if "tool_choice" in api_params and api_params["tool_choice"] is not None:
                        tool_choice_val = str(api_params["tool_choice"])
                        tool_choice: Literal["auto", "none", "required"] = "auto"
                        if tool_choice_val in ["auto", "none", "required"]:
                            tool_choice = tool_choice_val  # type: ignore

                        response = await self.client.chat.completions.create(
                            model=cast(str, api_params["model"]),
                            messages=cast(List[ChatCompletionMessageParam], api_params["messages"]),
                            # temperature=cast(float, api_params["temperature"]),
                            # max_tokens=max_tokens,
                            tools=tools,
                            tool_choice=tool_choice,
                        )
                    else:
                        response = await self.client.chat.completions.create(
                            model=cast(str, api_params["model"]),
                            messages=cast(List[ChatCompletionMessageParam], api_params["messages"]),
                            # temperature=cast(float, api_params["temperature"]),
                            # max_tokens=max_tokens,
                            tools=tools,
                        )
                else:

                    response = await self.client.chat.completions.create(
                        model=cast(str, api_params["model"]),
                        messages=cast(List[ChatCompletionMessageParam], api_params["messages"]),
                        # temperature=cast(float, api_params["temperature"]),
                        # max_tokens=max_tokens,
                    )
            except Exception as api_error:
                logger.error(f"Azure OpenAI API request failed for model {api_params['model']}: {api_error}")
                raise ValueError(f"Azure OpenAI API error: {api_error}")

            # Validate response
            if not hasattr(response, "choices") or not response.choices:
                logger.error(f"Invalid response format from Azure OpenAI API: {response}")
                raise ValueError("Invalid response format from Azure OpenAI API")

            # Extract response data
            message = response.choices[0].message
            content = message.content
            tool_calls = []

            if hasattr(message, "tool_calls") and message.tool_calls:
                for tool_call in message.tool_calls:
                    tool_calls.append(
                        {
                            "id": tool_call.id,
                            "type": tool_call.type,
                            "function": {
                                "name": tool_call.function.name,
                                "arguments": tool_call.function.arguments,
                            },
                        }
                    )

            usage_info = None
            if response.usage:
                usage_info = {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens,
                }

            return ChatCompletionResponse(
                content=content,
                tool_calls=tool_calls if tool_calls else None,
                finish_reason=response.choices[0].finish_reason,
                usage=usage_info,
            )

        except Exception as e:
            logger.error(f"Azure OpenAI API call failed: {e}")
            raise e

    async def chat_completion_stream(
        self, request: ChatCompletionRequest
    ) -> AsyncGenerator[ChatCompletionStreamChunk, None]:
        """
        Generate a streaming chat completion using Azure OpenAI API.

        Args:
            request: The chat completion request

        Yields:
            Stream chunks of the completion response
        """
        try:
            if request.model not in self.supported_models:
                logger.warning(f"Model {request.model} is not in the supported models list for {self.provider_name}")

            messages = []
            for i, msg in enumerate(request.messages):
                if msg.role == "tool":
                    prev_msg = request.messages[i - 1] if i > 0 else None
                    has_tool_calls = (
                        prev_msg and hasattr(prev_msg, "tool_calls") and getattr(prev_msg, "tool_calls", None)
                    )
                    if has_tool_calls:
                        message_dict = {
                            "role": "user",
                            "content": f"Tool execution result: {msg.content}",
                        }
                    else:
                        message_dict = {
                            "role": "user",
                            "content": f"Tool result: {msg.content}",
                        }
                else:
                    message_dict = {"role": msg.role, "content": msg.content}
                messages.append(message_dict)

            api_params = {
                "model": request.model,
                "messages": messages,
                "temperature": request.temperature,
                "stream": True,
            }

            if request.tools:
                logger.warning("Tools are not supported in streaming mode, falling back to regular completion")
                response = await self.chat_completion(request)
                if response.content:
                    yield ChatCompletionStreamChunk(content=response.content, finish_reason=response.finish_reason)
                return

            max_tokens_value = api_params.get("max_tokens")
            max_tokens = cast(int, max_tokens_value) if max_tokens_value is not None else None

            stream = await self.client.chat.completions.create(
                model=cast(str, api_params["model"]),
                messages=cast(List[ChatCompletionMessageParam], api_params["messages"]),
                # temperature=cast(float, api_params["temperature"]),
                # max_tokens=max_tokens,
                stream=True,
            )

            async for chunk in stream:
                if chunk.choices and len(chunk.choices) > 0:
                    choice = chunk.choices[0]
                    if choice.delta and choice.delta.content:
                        yield ChatCompletionStreamChunk(
                            content=choice.delta.content,
                            finish_reason=choice.finish_reason,
                        )
                    elif choice.finish_reason:
                        yield ChatCompletionStreamChunk(
                            content=None,
                            finish_reason=choice.finish_reason,
                        )

        except Exception as e:
            logger.error(f"Azure OpenAI streaming API call failed: {e}")
            raise e

    def is_available(self) -> bool:
        """
        Check if the provider is properly configured and available.

        Returns:
            True if the provider is available, False otherwise
        """
        try:
            return bool(self.api_key and self.api_endpoint)
        except Exception:
            return False

    @property
    def provider_name(self) -> str:
        """
        Get the name of the provider.

        Returns:
            The provider name
        """
        return "azure_openai"

    @property
    def supported_models(self) -> List[str]:
        """
        Get the list of supported models (deployments) for this provider.

        Returns:
            List of supported model names
        """
        # Note: On Azure, these are deployment names configured in your resource
        return [
            "gpt-4o",
            "gpt-4",
            "gpt-4-turbo",
            "gpt-3.5-turbo",
            "gpt-5",
        ]
