import type { Message } from "@/store/types";
import { authService } from "./authService";

interface StatusChangePayload {
  connected: boolean;
  error: string | null;
}

type ServiceCallback<T> = (payload: T) => void;

class XyzenService {
  private ws: WebSocket | null = null;
  private onMessageCallback: ServiceCallback<Message> | null = null;
  private onStatusChangeCallback: ServiceCallback<StatusChangePayload> | null =
    null;
  private backendUrl = "";

  public setBackendUrl(url: string) {
    this.backendUrl = url;
  }

  public connect(
    sessionId: string,
    topicId: string,
    onMessage: ServiceCallback<Message>,
    onStatusChange: ServiceCallback<StatusChangePayload>,
  ) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log("WebSocket is already connected.");
      return;
    }

    this.onMessageCallback = onMessage;
    this.onStatusChangeCallback = onStatusChange;

    // Get authentication token
    const token = authService.getToken();
    if (!token) {
      console.error("XyzenService: No authentication token available");
      this.onStatusChangeCallback?.({
        connected: false,
        error: "Authentication required",
      });
      return;
    }

    // Build WebSocket URL with token as query parameter
    const wsUrl = `${this.backendUrl.replace(
      /^http(s?):\/\//,
      "ws$1://",
    )}/ws/v1/chat/sessions/${sessionId}/topics/${topicId}?token=${encodeURIComponent(token)}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log("XyzenService: WebSocket connected");
      this.onStatusChangeCallback?.({ connected: true, error: null });
    };

    this.ws.onmessage = (event) => {
      try {
        const messageData = JSON.parse(event.data);
        this.onMessageCallback?.(messageData);
      } catch (error) {
        console.error("XyzenService: Failed to parse message data:", error);
      }
    };

    this.ws.onclose = (event) => {
      console.log(
        `XyzenService: WebSocket disconnected (code: ${event.code}, reason: ${event.reason})`,
      );
      this.onStatusChangeCallback?.({
        connected: false,
        error: event.reason || "Connection closed.",
      });
    };

    this.ws.onerror = (error) => {
      console.error("XyzenService: WebSocket error:", error);
      this.onStatusChangeCallback?.({
        connected: false,
        error: "A connection error occurred.",
      });
    };
  }

  public sendMessage(message: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ message }));
    } else {
      console.error("XyzenService: WebSocket is not connected.");
    }
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Export a singleton instance of the service
const xyzenService = new XyzenService();
export default xyzenService;
