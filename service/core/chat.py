"""
Chat service core module.
This module provides the core functionality for handling chat operations,
including message processing, user management, and chat history management.
"""

import logging
from typing import cast

from openai.types.chat import (
    ChatCompletionMessageParam,
    ChatCompletionSystemMessageParam,
    ChatCompletionUserMessageParam,
)

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
    messages: list[ChatCompletionMessageParam] = [
        cast(
            ChatCompletionSystemMessageParam,
            {"role": "system", "content": "You are a helpful AI assistant."},
        )
    ]

    # Add history messages from the topic
    for msg in topic.messages:
        messages.append(cast(ChatCompletionMessageParam, {"role": msg.role, "content": msg.content}))

    # Add the current user message
    messages.append(cast(ChatCompletionUserMessageParam, {"role": "user", "content": message_text}))

    logger.info(f"Sending {len(messages)} messages to AI for topic {topic.id}")

    try:
        response = client.chat.completions.create(
            model=configs.LLM.deployment,
            messages=messages,
            temperature=0.7,
        )
        response_text = response.choices[0].message.content
        logger.info(f"Received AI response for topic {topic.id}")
        return response_text or "Sorry, I could not generate a response."

    except Exception as e:
        logger.error(f"Failed to call AI service for topic {topic.id}: {e}")
        return f"Sorry, the AI service is currently unavailable. Error: {e}"
