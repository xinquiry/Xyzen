"""
Chat service core module.
This module provides the core functionality for handling chat operations,
including message processing, user management, and chat history management.
"""

import logging
from typing import Any, Dict, cast

from openai.types.chat import (
    ChatCompletionMessageParam,
    ChatCompletionSystemMessageParam,
    ChatCompletionUserMessageParam,
)
from openai.types.chat.chat_completion_tool_param import ChatCompletionToolParam

from core.client import get_client
from internal import configs
from models.topics import Topic as TopicModel

# --- Logger Setup ---
logger = logging.getLogger(__name__)


async def get_ai_response(message_text: str, topic: TopicModel) -> str:
    """
    Gets a response from the AI model based on the message and chat history.

    Args:
        message_text: The user's message.
        topic: The current chat topic containing the history.

    Returns:
        The AI's response as a string.
    """
    client = get_client()
    if not client:
        logger.warning("OpenAI client not configured. Returning a mock response.")
        return f"Echo: {message_text}"

    # Prepare the messages for the AI model
    system_prompt = "You are a helpful AI assistant."
    if topic.session.agent and topic.session.agent.prompt:
        system_prompt = topic.session.agent.prompt

    messages: list[ChatCompletionMessageParam] = [
        cast(
            ChatCompletionSystemMessageParam,
            {"role": "system", "content": system_prompt},
        )
    ]

    # Add history messages from the topic
    for msg in topic.messages:
        messages.append(cast(ChatCompletionMessageParam, {"role": msg.role, "content": msg.content}))

    # Add the current user message
    messages.append(cast(ChatCompletionUserMessageParam, {"role": "user", "content": message_text}))

    logger.info(f"Sending {len(messages)} messages to AI for topic {topic.id}")

    try:
        tool_kwargs: Dict[str, Any] = {}
        if topic.session.agent and topic.session.agent.mcp_servers:
            tools: list[ChatCompletionToolParam] = []
            for server in topic.session.agent.mcp_servers:
                if server.tools:
                    for tool in server.tools:
                        # Convert MCP tool format to OpenAI tool format
                        openai_tool: ChatCompletionToolParam = {
                            "type": "function",
                            "function": {
                                "name": tool.get("name", ""),
                                "description": tool.get("description", ""),
                                "parameters": tool.get("inputSchema", {}),
                            },
                        }
                        tools.append(openai_tool)
            if tools:
                tool_kwargs["tools"] = tools
                tool_kwargs["tool_choice"] = "auto"  # Let the model decide when to use tools

        response = client.chat.completions.create(
            model=configs.LLM.deployment,
            messages=messages,
            temperature=0.7,
            **tool_kwargs,
        )
        response_text = response.choices[0].message.content
        logger.info(f"Received AI response for topic {topic.id}")
        return response_text or "Sorry, I could not generate a response."

    except Exception as e:
        logger.error(f"Failed to call AI service for topic {topic.id}: {e}")
        return f"Sorry, the AI service is currently unavailable. Error: {e}"
