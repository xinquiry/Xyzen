import { useXyzen } from "@/store/xyzenStore";
import type { McpServer } from "@/types/mcp";

const getWsUrl = (path: string) => {
  const backendUrl = useXyzen.getState().backendUrl;
  const url = new URL(backendUrl);
  const protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${url.host}${path}`;
};

class WebSocketService {
  private ws: WebSocket | null = null;

  connect(path: string, onMessage: (data: McpServer) => void) {
    if (this.ws) {
      this.ws.close();
    }

    const url = getWsUrl(path);
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log("WebSocket connected");
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    this.ws.onclose = () => {
      console.log("WebSocket disconnected");
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const websocketService = new WebSocketService();
