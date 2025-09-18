"""
Chat service core module.
This module provides the core functionality for handling chat operations,
including message processing, user management, and chat history management.
"""

import asyncio
import logging
from typing import Any, Dict, List

from core.mcp import _async_check_mcp_server_status
from core.providers import (
    ChatCompletionRequest,
    ChatMessage,
    provider_manager,
)
from internal import configs
from models import McpServer
from models.topic import Topic as TopicModel

# --- Logger Setup ---
logger = logging.getLogger(__name__)


async def _load_providers_from_database() -> None:
    """
    Load LLM providers from the database providers table.
    """
    try:
        from sqlmodel import Session, select

        from middleware.database.connection import engine
        from models.provider import Provider

        with Session(engine) as session:
            providers = session.exec(select(Provider)).all()

            for db_provider in providers:
                try:
                    # Map database provider to our provider system
                    provider_type = _map_provider_type(db_provider.name)

                    provider_manager.add_provider(
                        name=f"db_{db_provider.name.lower()}_{db_provider.id}",
                        provider_type=provider_type,
                        api_key=db_provider.key,
                        base_url=db_provider.api,
                        default_model=db_provider.model or "gpt-4o",
                        max_tokens=db_provider.max_tokens,
                        temperature=db_provider.temperature,
                        timeout=db_provider.timeout,
                    )
                    logger.info(f"Loaded provider from database: {db_provider.name}")

                except Exception as e:
                    logger.error(f"Failed to load provider {db_provider.name} from database: {e}")

    except Exception as e:
        logger.error(f"Failed to load providers from database: {e}")


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


async def get_ai_response(message_text: str, topic: TopicModel) -> str:
    """
    Gets a response from the AI model based on the message and chat history.

    Args:
        message_text: The user's message.
        topic: The current chat topic containing the history.

    Returns:
        The AI's response as a string.
    """
    # Get active provider
    provider = provider_manager.get_active_provider()
    if not provider:
        logger.error("No LLM provider configured")
        return "Sorry, no AI provider is currently available."

    # Prepare system prompt
    system_prompt = "You are a helpful AI assistant."
    if topic.session.agent and topic.session.agent.prompt:
        system_prompt = topic.session.agent.prompt

    # Build messages list
    messages: List[ChatMessage] = [ChatMessage(role="system", content=system_prompt)]

    # Add history messages from the topic
    for msg in topic.messages:
        messages.append(ChatMessage(role=msg.role, content=msg.content))

    # Add the current user message
    messages.append(ChatMessage(role="user", content=message_text))

    logger.info(f"Sending {len(messages)} messages to AI provider {provider.provider_name} for topic {topic.id}")

    try:
        # Use default model from config or provider
        model = configs.LLM.deployment

        # Prepare tools if MCP servers are available
        tools = await _prepare_mcp_tools(topic)

        # Create request
        request = ChatCompletionRequest(
            messages=messages,
            model=model,
            temperature=0.7,
            tools=tools if tools else None,
            tool_choice="auto" if tools else None,
        )

        # Get response from provider
        response = await provider.chat_completion(request)

        logger.info(f"Response from provider: {response}")

        # Handle tool calls if present
        if response.tool_calls and len(response.tool_calls) > 0:
            logger.info(f"AI requested {len(response.tool_calls)} tool call(s)")

            # Add the assistant's message to history (even if no content, the tool calls are important)
            assistant_content = response.content or "I'll use the available tools to help you."
            messages.append(ChatMessage(role="assistant", content=assistant_content))

            # Execute each tool call and collect results
            tool_results = []
            for tool_call in response.tool_calls:
                try:
                    tool_name = tool_call.get("function", {}).get("name", "")
                    tool_args = tool_call.get("function", {}).get("arguments", "{}")
                    tool_id = tool_call.get("id", "")

                    logger.info(f"Executing tool: {tool_name} with args: {tool_args}")

                    # Execute the tool (this would need to be implemented)
                    tool_result = await _execute_tool_call(tool_name, tool_args, topic)

                    # Process and format tool result
                    formatted_result = _format_tool_result(tool_result, tool_name)

                    # Add tool result to messages
                    tool_results.append({"tool_call_id": tool_id, "content": formatted_result})
                    messages.append(ChatMessage(role="tool", content=formatted_result))

                    logger.info(f"Added tool result to conversation: {formatted_result[:200]}...")

                except Exception as tool_error:
                    logger.error(f"Tool execution failed: {tool_error}")
                    error_msg = f"Error executing tool '{tool_name}': {str(tool_error)[:200]}"
                    messages.append(ChatMessage(role="tool", content=error_msg))

            # Make another request to get the final response
            try:
                # Log the message count for debugging
                logger.info(f"Preparing final request with {len(messages)} messages")

                # Calculate approximate token count (rough estimate)
                total_chars = sum(len(msg.content) for msg in messages)
                logger.info(f"Approximate conversation length: {total_chars} characters")

                # Don't include tools in the final request to prevent additional tool calls
                final_request = ChatCompletionRequest(
                    messages=messages,
                    model=model,
                    temperature=0.7,
                    tools=None,  # No tools for final response
                    tool_choice=None,
                )

                final_response = await provider.chat_completion(final_request)

                logger.info(
                    f"Final response from provider: content='{final_response.content}', "
                    f"tool_calls={final_response.tool_calls}"
                )

                if final_response.content:
                    logger.info(f"Received final AI response after tool execution")
                    return final_response.content
                else:
                    logger.warning(f"Final response had no content: {final_response}")
                    return "I executed the requested tools but couldn't generate a final response."

            except Exception as final_error:
                logger.error(f"Failed to get final response after tool execution: {final_error}")
                return f"I executed the tools but encountered an error generating the final response: {final_error}"

        # Handle regular content response
        if response.content:
            logger.info(f"Received AI response from {provider.provider_name} for topic {topic.id}")
            return response.content
        else:
            return "Sorry, I could not generate a response."

    except Exception as e:
        logger.error(f"Failed to call AI provider {provider.provider_name} for topic {topic.id}: {e}")
        return f"Sorry, the AI service is currently unavailable. Error: {e}"


async def _prepare_mcp_tools(topic: TopicModel) -> List[Dict[str, Any]]:
    """
    Prepare MCP tools for the AI request.

    Args:
        topic: The current chat topic

    Returns:
        List of tool definitions
    """
    tools: List[Dict[str, Any]] = []

    if topic.session.agent and topic.session.agent.mcp_servers:
        # Update all MCP server tool lists before generating response
        logger.info("Updating MCP server tools before generating response...")
        update_tasks = []

        for server in topic.session.agent.mcp_servers:
            update_tasks.append(_async_check_mcp_server_status(server.id))

        # Execute all server status checks concurrently
        await asyncio.gather(*update_tasks, return_exceptions=True)
        logger.info("MCP server tools updated")

        # Refresh server data from database to build tool list
        from sqlmodel import Session

        from middleware.database.connection import engine

        with Session(engine) as session:
            # Refresh server data
            refreshed_servers = []
            for server in topic.session.agent.mcp_servers:
                refreshed_server = session.get(type(server), server.id)
                if refreshed_server:
                    refreshed_servers.append(refreshed_server)

            # Build tool list
            for server in refreshed_servers:
                if server.tools and server.status == "online":
                    for tool in server.tools:
                        # Convert MCP tool format to standard format
                        standard_tool = {
                            "name": tool.get("name", ""),
                            "description": tool.get("description", ""),
                            "parameters": tool.get("inputSchema", {}),
                        }
                        tools.append(standard_tool)

            if tools:
                logger.info(f"Using {len(tools)} tools from {len(refreshed_servers)} servers")

    return tools


async def _execute_tool_call(tool_name: str, tool_args: str, topic: TopicModel) -> str:
    """
    Execute a tool call by finding the appropriate MCP server and calling the tool.

    Args:
        tool_name: The name of the tool to execute
        tool_args: JSON string containing the tool arguments
        topic: The current chat topic

    Returns:
        The result of the tool execution as a string
    """
    try:
        import json

        from sqlmodel import Session

        from middleware.database.connection import engine

        # Parse tool arguments
        try:
            args_dict = json.loads(tool_args) if tool_args else {}
        except json.JSONDecodeError:
            return f"Error: Invalid JSON arguments for tool '{tool_name}'"

        logger.info(f"Executing tool '{tool_name}' with arguments: {args_dict}")

        # Find the MCP server that provides this tool
        if topic.session.agent and topic.session.agent.mcp_servers:
            with Session(engine) as session:
                for server in topic.session.agent.mcp_servers:
                    refreshed_server = session.get(type(server), server.id)
                    if refreshed_server and refreshed_server.tools and refreshed_server.status == "online":
                        for tool in refreshed_server.tools:
                            if tool.get("name") == tool_name:
                                # Found the tool, now execute it via MCP
                                try:
                                    result = await _call_mcp_tool(refreshed_server, tool_name, args_dict)
                                    return str(result)
                                except Exception as exec_error:
                                    logger.error(f"MCP tool execution failed: {exec_error}")
                                    return f"Error executing tool '{tool_name}': {exec_error}"

        return f"Tool '{tool_name}' not found or server not available"

    except Exception as e:
        logger.error(f"Tool execution error: {e}")
        return f"Error: {e}"


async def _call_mcp_tool(server: McpServer, tool_name: str, args_dict: Dict[str, Any]) -> Any:
    """
    Call a specific tool on an MCP server.

    Args:
        server: The MCP server object
        tool_name: The name of the tool to call
        args_dict: The arguments to pass to the tool

    Returns:
        The result from the tool execution
    """
    try:
        from fastmcp import Client
        from fastmcp.client.auth import BearerAuth

        logger.info(f"Calling MCP tool '{tool_name}' on server {server.url}")

        # Use BearerAuth if a token is provided, otherwise no auth
        auth = BearerAuth(server.token) if server.token else None

        # Initialize the client with the server URL and auth helper
        client = Client(server.url, auth=auth)

        async with client:
            # Call the tool
            result = await client.call_tool(tool_name, args_dict)
            logger.info(f"MCP tool '{tool_name}' returned: {result}")
            return result.content if hasattr(result, "content") else str(result)

    except ImportError:
        # Fallback: try to mock the tool execution for testing
        logger.warning(f"MCP integration not available, mocking tool '{tool_name}' result")
        return f"Mock result for tool '{tool_name}' with args {args_dict}"
    except Exception as e:
        logger.error(f"MCP tool call failed: {e}")
        raise e


def _format_tool_result(tool_result: Any, tool_name: str) -> str:
    """
    Format tool result for AI consumption, handling large JSON responses.

    Args:
        tool_result: The raw tool result
        tool_name: The name of the tool that was executed

    Returns:
        Formatted string suitable for AI processing
    """
    try:
        # If result has content attribute, extract it
        if hasattr(tool_result, "content") and tool_result.content:
            content = tool_result.content

            # If content is a list, get the first text content
            if isinstance(content, list) and len(content) > 0:
                first_content = content[0]
                if hasattr(first_content, "text"):
                    result_text = first_content.text
                else:
                    result_text = str(first_content)
            else:
                result_text = str(content)
        else:
            result_text = str(tool_result)

        # Try to parse as JSON for special formatting
        import json

        try:
            data = json.loads(result_text)

            # Special handling for tool_environment_current_functions
            if tool_name == "tool_environment_current_functions" and isinstance(data, dict):
                if "summary" in data:
                    summary = data["summary"]
                    formatted = f"Tool Environment Status:\n"
                    formatted += f"• Total Functions: {summary.get('total_functions', 'N/A')}\n"
                    formatted += f"• Built-in Tools: {summary.get('builtin_tools', 'N/A')}\n"
                    formatted += f"• Dynamic Tools: {summary.get('dynamic_tools', 'N/A')}\n"
                    formatted += f"• Proxy Tools: {summary.get('proxy_tools', 'N/A')}\n"
                    formatted += f"• Tool Environments: {summary.get('tool_environments', 'N/A')}\n"

                    if "builtin_tools" in data and isinstance(data["builtin_tools"], dict):
                        formatted += f"\nAvailable Built-in Tools:\n"
                        for tool, info in list(data["builtin_tools"].items())[:5]:  # Limit to first 5
                            formatted += f"• {tool}: {info.get('description', 'No description')[:100]}...\n"

                        if len(data["builtin_tools"]) > 5:
                            formatted += f"... and {len(data['builtin_tools']) - 5} more tools\n"

                    return formatted

            # For other JSON responses, provide a summary
            if isinstance(data, dict):
                keys = list(data.keys())[:5]  # First 5 keys
                return f"Tool '{tool_name}' returned JSON data with keys: {keys}"
            elif isinstance(data, list):
                return f"Tool '{tool_name}' returned a list with {len(data)} items"

        except json.JSONDecodeError:
            pass

        # Truncate very long results
        if len(result_text) > 2000:
            truncated_result = f"Tool '{tool_name}' result (truncated): {result_text[:1500]}..."
            length_info = f"\n(Result was {len(result_text)} characters long)"
            return truncated_result + length_info

        return f"Tool '{tool_name}' result: {result_text}"

    except Exception as e:
        logger.error(f"Error formatting tool result: {e}")
        return f"Tool '{tool_name}' executed but result formatting failed: {e}"
