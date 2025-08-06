import datetime

import httpx
from sqlmodel import Session

from middleware.database.connection import engine
from models import McpServer


def check_mcp_server_status(server_id: int) -> None:
    """
    Checks the status of an MCP server, updates its tools list, and records the check time.
    """
    with Session(engine) as session:
        server = session.get(McpServer, server_id)
        if not server:
            return

        try:
            with httpx.Client() as client:
                headers = {"Authorization": f"Bearer {server.token}"}
                response = client.get(f"{server.url}/tools", headers=headers)

                if response.status_code == 200:
                    server.status = "online"
                    server.tools = response.json()
                else:
                    server.status = "offline"
                    server.tools = None
        except httpx.RequestError:
            server.status = "offline"
            server.tools = None
        finally:
            server.last_checked_at = datetime.datetime.utcnow()
            session.add(server)
            session.commit()
            session.refresh(server)
