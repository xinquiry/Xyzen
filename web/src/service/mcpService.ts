import { useXyzen } from "@/store/xyzenStore";
import type { McpServer, McpServerCreate } from "@/types/mcp";

const getBackendUrl = () => useXyzen.getState().backendUrl;

export const mcpService = {
  async getMcpServers(): Promise<McpServer[]> {
    const response = await fetch(`${getBackendUrl()}/api/v1/mcps`);
    if (!response.ok) {
      throw new Error("Failed to fetch MCP servers");
    }
    return response.json();
  },

  async createMcpServer(server: McpServerCreate): Promise<McpServer> {
    const response = await fetch(`${getBackendUrl()}/api/v1/mcps`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(server),
    });
    if (!response.ok) {
      throw new Error("Failed to create MCP server");
    }
    return response.json();
  },

  async updateMcpServer(
    id: string,
    server: Partial<McpServerCreate>,
  ): Promise<McpServer> {
    const response = await fetch(`${getBackendUrl()}/api/v1/mcps/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(server),
    });
    if (!response.ok) {
      throw new Error("Failed to update MCP server");
    }
    return response.json();
  },

  async deleteMcpServer(id: string): Promise<void> {
    const response = await fetch(`${getBackendUrl()}/api/v1/mcps/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Failed to delete MCP server");
    }
  },
};
