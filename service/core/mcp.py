import asyncio
import datetime

from fastmcp import Client
from fastmcp.client.auth import BearerAuth
from sqlmodel import Session

from handler.ws.v1.mcp import manager as ws_manager
from middleware.database.connection import engine
from models import McpServer


async def _async_check_mcp_server_status(server_id: int) -> None:
    """
    Asynchronously checks the status of an MCP server using fastmcp.Client.
    """
    with Session(engine) as session:
        server = session.get(McpServer, server_id)
        if not server:
            return

        try:
            # Use BearerAuth if a token is provided, otherwise no auth
            auth = BearerAuth(server.token) if server.token else None

            # Initialize the client with the server URL and auth helper
            client = Client(server.url, auth=auth)

            async with client:
                # list_tools() will implicitly check the connection and list tools
                tools_response = await client.list_tools()
                server.status = "online"
                server.tools = [tool.model_dump() for tool in tools_response]
        except Exception:
            server.status = "offline"
            server.tools = []
        finally:
            server.last_checked_at = datetime.datetime.utcnow()
            session.add(server)
            session.commit()
            session.refresh(server)
            # Broadcast the update to all connected clients
            await ws_manager.broadcast(server.model_dump())


def check_mcp_server_status(server_id: int) -> None:
    """
    Checks the status of an MCP server, updates its tools list, and records the check time.
    This is a sync wrapper for the async check function.
    """
    try:
        # Try to run in the existing event loop if there is one
        loop = asyncio.get_running_loop()
        loop.create_task(_async_check_mcp_server_status(server_id))
    except RuntimeError:
        # If no event loop is running, run it in a new one
        asyncio.run(_async_check_mcp_server_status(server_id))
