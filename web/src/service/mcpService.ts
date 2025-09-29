import { authService } from "@/service/authService";
import { useXyzen } from "@/store";
import type { McpServer, McpServerCreate } from "@/types/mcp";

const getBackendUrl = () => useXyzen.getState().backendUrl;

const createAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = authService.getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

export const mcpService = {
  async getMcpServers(): Promise<McpServer[]> {
    const response = await fetch(`${getBackendUrl()}/xyzen/api/v1/mcps`, {
      headers: createAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error("Failed to fetch MCP servers");
    }
    return response.json();
  },

  async createMcpServer(server: McpServerCreate): Promise<McpServer> {
    const response = await fetch(`${getBackendUrl()}/xyzen/api/v1/mcps`, {
      method: "POST",
      headers: createAuthHeaders(),
      body: JSON.stringify(server),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to create MCP server: ${response.status} ${errorText}`,
      );
    }
    return response.json();
  },

  async updateMcpServer(
    id: string,
    server: Partial<McpServerCreate>,
  ): Promise<McpServer> {
    const response = await fetch(`${getBackendUrl()}/xyzen/api/v1/mcps/${id}`, {
      method: "PATCH",
      headers: createAuthHeaders(),
      body: JSON.stringify(server),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to update MCP server: ${response.status} ${errorText}`,
      );
    }
    return response.json();
  },

  async deleteMcpServer(id: string): Promise<void> {
    const response = await fetch(`${getBackendUrl()}/xyzen/api/v1/mcps/${id}`, {
      method: "DELETE",
      headers: createAuthHeaders(),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to delete MCP server: ${response.status} ${errorText}`,
      );
    }
  },

  async refreshMcpServers(): Promise<void> {
    const response = await fetch(
      `${getBackendUrl()}/xyzen/api/v1/mcps/refresh`,
      {
        method: "POST",
        headers: createAuthHeaders(),
      },
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to trigger MCP server refresh: ${response.status} ${errorText}`,
      );
    }
  },
};
