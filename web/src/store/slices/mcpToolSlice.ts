import type { McpServer } from "@/types/mcp";
import type { StateCreator } from "zustand";
import type { XyzenState } from "../types";

export interface McpToolState {
  // Tool testing modal state
  toolTestModal: {
    isOpen: boolean;
    server?: McpServer;
    toolName?: string;
    toolDescription?: string;
  };
  // Tool execution history (optional for future use)
  toolExecutionHistory: ToolExecution[];
}

export interface ToolExecution {
  id: string;
  serverId: string;
  toolName: string;
  parameters: Record<string, unknown>;
  result?: unknown;
  success: boolean;
  error?: string;
  executionTime: number;
  timestamp: Date;
}

export interface McpToolActions {
  // Tool testing modal actions
  openToolTestModal: (
    server: McpServer,
    toolName: string,
    toolDescription?: string,
  ) => void;
  closeToolTestModal: () => void;

  // Tool execution history actions
  addToolExecution: (
    execution: Omit<ToolExecution, "id" | "timestamp">,
  ) => void;
  clearToolExecutionHistory: () => void;
  getToolExecutionHistory: (
    serverId?: string,
    toolName?: string,
  ) => ToolExecution[];
}

export interface McpToolSlice extends McpToolState, McpToolActions {}

export const createMcpToolSlice: StateCreator<
  XyzenState,
  [["zustand/immer", never]],
  [],
  McpToolSlice
> = (set, get) => ({
  // Initial state
  toolTestModal: {
    isOpen: false,
  },
  toolExecutionHistory: [],

  // Actions
  openToolTestModal: (server, toolName, toolDescription) => {
    set((state) => {
      state.toolTestModal = {
        isOpen: true,
        server,
        toolName,
        toolDescription,
      };
    });
  },

  closeToolTestModal: () => {
    set((state) => {
      state.toolTestModal = {
        isOpen: false,
      };
    });
  },

  addToolExecution: (executionData) => {
    set((state) => {
      const execution: ToolExecution = {
        ...executionData,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
      };
      state.toolExecutionHistory.unshift(execution);

      // Keep only the last 100 executions to prevent memory bloat
      if (state.toolExecutionHistory.length > 100) {
        state.toolExecutionHistory = state.toolExecutionHistory.slice(0, 100);
      }
    });
  },

  clearToolExecutionHistory: () => {
    set((state) => {
      state.toolExecutionHistory = [];
    });
  },

  getToolExecutionHistory: (serverId, toolName) => {
    const { toolExecutionHistory } = get();

    if (!serverId && !toolName) {
      return toolExecutionHistory;
    }

    return toolExecutionHistory.filter((execution: ToolExecution) => {
      const matchesServer = !serverId || execution.serverId === serverId;
      const matchesTool = !toolName || execution.toolName === toolName;
      return matchesServer && matchesTool;
    });
  },
});
