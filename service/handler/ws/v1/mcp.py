import json
from typing import Any, List

from fastapi import APIRouter, WebSocket, WebSocketDisconnect


class ConnectionManager:
    """Manages active WebSocket connections."""

    def __init__(self) -> None:
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        self.active_connections.remove(websocket)

    async def broadcast(self, data: Any) -> None:
        """Broadcasts a message to all connected clients."""
        # Use default=str to handle non-serializable types like datetime
        message = json.dumps(data, default=str)
        for connection in self.active_connections:
            await connection.send_text(message)


manager = ConnectionManager()

router = APIRouter()


@router.websocket("")
async def websocket_endpoint(websocket: WebSocket) -> None:
    """WebSocket endpoint for MCP server status updates."""
    await manager.connect(websocket)
    try:
        while True:
            # Keep the connection open to listen for disconnects
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
