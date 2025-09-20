import type { StateCreator } from "zustand";
import type { XyzenState } from "../types";

export interface LoadingSlice {
  // Loading states for different operations
  loadingStates: Record<string, boolean>;

  // Methods
  setLoading: (key: string, loading: boolean) => void;
  getLoading: (key: string) => boolean;
  clearAllLoading: () => void;
}

export const createLoadingSlice: StateCreator<
  XyzenState,
  [["zustand/immer", never]],
  [],
  LoadingSlice
> = (set, get) => ({
  loadingStates: {},

  setLoading: (key: string, loading: boolean) => {
    set((state) => {
      if (loading) {
        state.loadingStates[key] = true;
      } else {
        delete state.loadingStates[key];
      }
    });
  },

  getLoading: (key: string) => {
    return get().loadingStates[key] || false;
  },

  clearAllLoading: () => {
    set((state) => {
      state.loadingStates = {};
    });
  },
});

// Loading key constants for consistency
export const LoadingKeys = {
  CHAT_HISTORY: "chatHistory",
  AGENTS_LIST: "agentsList",
  TOPIC_MESSAGES: "topicMessages",
  USER_AUTH: "userAuth",
  CREATE_SESSION: "createSession",
  UPDATE_TOPIC: "updateTopic",
  AGENT_CREATE: "agentCreate",
  AGENT_UPDATE: "agentUpdate",
  AGENT_DELETE: "agentDelete",
  MCP_SERVERS: "mcpServers",
  MCP_SERVER_CREATE: "mcpServerCreate",
  MCP_SERVER_UPDATE: "mcpServerUpdate",
  MCP_SERVER_DELETE: "mcpServerDelete",
} as const;

export type LoadingKey = (typeof LoadingKeys)[keyof typeof LoadingKeys];
