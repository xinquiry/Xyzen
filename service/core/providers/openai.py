"""
OpenAI LLM Provider implementation.
Standard OpenAI API support (use AzureOpenAIProvider for Azure).
"""

import logging
from typing import Any, AsyncGenerator, List, Literal, Optional, cast

from openai import AsyncOpenAI
from openai.types.chat import ChatCompletionMessageParam
from openai.types.chat.chat_completion_tool_param import ChatCompletionToolParam

from .base import (
    BaseLLMProvider,
    ChatCompletionRequest,
    ChatCompletionResponse,
    ChatCompletionStreamChunk,
)

logger = logging.getLogger(__name__)


class OpenAIProvider(BaseLLMProvider):
    """
    Standard OpenAI provider implementation.
    For Azure OpenAI, use AzureOpenAIProvider instead.
    """

    def __init__(
        self,
        api_key: str,
        api_endpoint: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        timeout: int = 60,
        **kwargs: Any,
    ) -> None:
        """
        Initialize the OpenAI provider.

        Args:
            api_key: The API key for authentication
            api_endpoint: API endpoint URL (defaults to OpenAI's official endpoint)
            model: The default model name
            max_tokens: Maximum tokens for responses
            temperature: Sampling temperature
            timeout: Request timeout in seconds
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

        # Initialize OpenAI client
        logger.info(f"Initializing OpenAI client with endpoint: {api_endpoint or 'default'}")
        self.client = AsyncOpenAI(
            api_key=self.api_key,
            base_url=self.api_endpoint,
            timeout=self.timeout,
        )

        # Mark as supporting streaming
        self._streaming_supported = True

    async def chat_completion(self, request: ChatCompletionRequest) -> ChatCompletionResponse:
        """
        Generate a chat completion using OpenAI API.

        Args:
            request: The chat completion request

        Returns:
            The chat completion response
        """
        try:
            # Validate model
            if request.model not in self.supported_models:
                logger.warning(f"Model {request.model} is not in the supported models list for {self.provider_name}")
                # Don't raise an error, just log a warning - let API decide if model is valid

            # Convert standard messages to OpenAI format
            messages = []
            for i, msg in enumerate(request.messages):
                if msg.role == "tool":
                    # OpenAI requires tool messages to have tool_call_id and follow a message with tool_calls
                    # Skip tool messages that don't have a proper context or convert them to user messages
                    prev_msg = request.messages[i - 1] if i > 0 else None
                    has_tool_calls = (
                        prev_msg and hasattr(prev_msg, "tool_calls") and getattr(prev_msg, "tool_calls", None)
                    )
                    if has_tool_calls:
                        # This is a proper tool response, but we need tool_call_id
                        # For now, convert to user message with clear indication it's a tool result
                        message_dict = {
                            "role": "user",
                            "content": f"Tool execution result: {msg.content}",
                        }
                    else:
                        # Convert tool messages to user messages to avoid OpenAI validation errors
                        message_dict = {
                            "role": "user",
                            "content": f"Tool result: {msg.content}",
                        }
                else:
                    message_dict = {"role": msg.role, "content": msg.content}
                messages.append(message_dict)

            # Prepare API call parameters
            api_params = {
                "model": request.model,
                "messages": messages,
                "temperature": request.temperature,
            }

            if request.max_tokens:
                api_params["max_tokens"] = request.max_tokens

            # Handle tools if provided
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

            try:
                if "tools" in api_params and api_params["tools"] is not None:
                    tools = cast(List[ChatCompletionToolParam], api_params["tools"])
                    if "tool_choice" in api_params and api_params["tool_choice"] is not None:
                        # Handle tool_choice - OpenAI supports "auto", "none", "required", or specific tool
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
                logger.error(f"OpenAI API request failed for model {api_params['model']}: {api_error}")
                raise ValueError(f"OpenAI API error: {api_error}")

            # Validate response format
            if not hasattr(response, "choices") or not response.choices:
                logger.error(f"Invalid response format from OpenAI API: {response}")
                raise ValueError("Invalid response format from OpenAI API")

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
            logger.error(f"OpenAI API call failed: {e}")
            raise e

    async def chat_completion_stream(
        self, request: ChatCompletionRequest
    ) -> AsyncGenerator[ChatCompletionStreamChunk, None]:
        """
        Generate a streaming chat completion using OpenAI API.

        Args:
            request: The chat completion request

        Yields:
            Stream chunks of the completion response
        """
        try:
            # Validate model
            if request.model not in self.supported_models:
                logger.warning(f"Model {request.model} is not in the supported models list for {self.provider_name}")

            # Convert standard messages to OpenAI format (same as regular completion)
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

            # Prepare API call parameters
            api_params = {
                "model": request.model,
                "messages": messages,
                "temperature": request.temperature,
                "stream": True,  # Enable streaming
            }

            # if request.max_tokens:
            #     api_params["max_tokens"] = request.max_tokens

            # Note: Streaming typically doesn't support tools, so we skip tool handling for now
            if request.tools:
                logger.warning("Tools are not supported in streaming mode, falling back to regular completion")
                # Fall back to regular completion for tool calls
                response = await self.chat_completion(request)
                if response.content:
                    yield ChatCompletionStreamChunk(content=response.content, finish_reason=response.finish_reason)
                return

            # Make the streaming API call
            max_tokens_value = api_params.get("max_tokens")
            max_tokens = cast(int, max_tokens_value) if max_tokens_value is not None else None

            stream = await self.client.chat.completions.create(
                model=cast(str, api_params["model"]),
                messages=cast(List[ChatCompletionMessageParam], api_params["messages"]),
                temperature=cast(float, api_params["temperature"]),
                max_tokens=max_tokens,
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
            logger.error(f"OpenAI streaming API call failed: {e}")
            raise e

    def is_available(self) -> bool:
        """
        Check if the provider is properly configured and available.

        Returns:
            True if the provider is available, False otherwise
        """
        try:
            return bool(self.api_key)
        except Exception:
            return False

    @property
    def provider_name(self) -> str:
        """
        Get the name of the provider.

        Returns:
            The provider name
        """
        return "openai"

    @property
    def supported_models(self) -> List[str]:
        """
        Get the list of supported models for this provider.

        Returns:
            List of supported model names
        """
        return [
            "gpt-4o",
            "gpt-4o-mini",
            "gpt-4-turbo",
            "gpt-4",
            "gpt-3.5-turbo",
            "gpt-3.5-turbo-16k",
            "o1-preview",
            "o1-mini",
        ]
