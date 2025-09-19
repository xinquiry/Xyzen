import { mcpService } from "@/service/mcpService";
import type { McpServer, McpServerCreate } from "@/types/mcp";
import type { StateCreator } from "zustand";
import type { XyzenState } from "../types";

export interface McpSlice {
  mcpServers: McpServer[];
  mcpServersLoading: boolean;
  fetchMcpServers: () => Promise<void>;
  addMcpServer: (server: McpServerCreate) => Promise<void>;
  editMcpServer: (
    id: string,
    server: Partial<McpServerCreate>,
  ) => Promise<void>;
  removeMcpServer: (id: string) => Promise<void>;
  updateMcpServerInList: (server: McpServer) => void;
}

export const createMcpSlice: StateCreator<
  XyzenState,
  [["zustand/immer", never]],
  [],
  McpSlice
> = (set, get) => ({
  mcpServers: [],
  mcpServersLoading: false,
  fetchMcpServers: async () => {
    set({ mcpServersLoading: true });
    try {
      const servers = await mcpService.getMcpServers();
      set({ mcpServers: servers, mcpServersLoading: false });
    } catch (error) {
      console.error("Failed to fetch MCP servers:", error);
      set({ mcpServersLoading: false });
    }
  },
  addMcpServer: async (server) => {
    try {
      const newServer = await mcpService.createMcpServer(server);
      set((state: McpSlice) => {
        state.mcpServers.push(newServer);
      });
      get().closeAddMcpServerModal();
    } catch (error) {
      console.error("Failed to add MCP server:", error);
      throw error;
    }
  },
  editMcpServer: async (id, server) => {
    try {
      const updatedServer = await mcpService.updateMcpServer(id, server);
      set((state: McpSlice) => {
        const index = state.mcpServers.findIndex((s) => s.id === id);
        if (index !== -1) {
          state.mcpServers[index] = updatedServer;
        }
      });
    } catch (error) {
      console.error("Failed to edit MCP server:", error);
    }
  },
  removeMcpServer: async (id) => {
    try {
      await mcpService.deleteMcpServer(id);
      set((state: McpSlice) => {
        state.mcpServers = state.mcpServers.filter((s) => s.id !== id);
      });
    } catch (error) {
      console.error("Failed to remove MCP server:", error);
    }
  },
  updateMcpServerInList: (server) => {
    set((state: McpSlice) => {
      const index = state.mcpServers.findIndex((s) => s.id === server.id);
      if (index !== -1) {
        state.mcpServers[index] = server;
      } else {
        state.mcpServers.push(server);
      }
    });
  },
});
