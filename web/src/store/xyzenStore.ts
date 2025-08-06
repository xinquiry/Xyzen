import { mcpService } from "@/service/mcpService";
import xyzenService from "@/service/xyzenService";
import type { McpServer, McpServerCreate } from "@/types/mcp";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import type { Agent } from "@/components/layouts/XyzenAgent";

// 定义应用中的核心类型
export interface Message {
  id: string;
  content: string;
  role: "user" | "assistant" | "system" | "tool";
  created_at: string;
  // Legacy fields for backward compatibility
  sender?: "user" | "assistant" | "system";
  timestamp?: string;
}

export interface ChatChannel {
  id: string; // This will now be the Topic ID
  sessionId: string; // The session this topic belongs to
  title: string;
  messages: Message[];
  assistantId?: string;
  connected: boolean;
  error: string | null;
}

export interface ChatHistoryItem {
  id: string;
  title: string;
  updatedAt: string;
  assistantTitle: string;
  lastMessage?: string;
  isPinned: boolean;
}

export interface User {
  username: string;
  avatar: string;
}

export type Theme = "light" | "dark" | "system";

// Add types for API response
interface TopicResponse {
  id: string;
  name: string;
  updated_at: string;
}

interface SessionResponse {
  id: string;
  name: string;
  username: string;
  topics: TopicResponse[];
}

interface XyzenState {
  backendUrl: string;
  isXyzenOpen: boolean;
  panelWidth: number;
  activeChatChannel: string | null;
  user: User | null;
  activeTabIndex: number;
  theme: Theme;

  chatHistory: ChatHistoryItem[];
  chatHistoryLoading: boolean;
  channels: Record<string, ChatChannel>;
  agents: Agent[];
  agentsLoading: boolean;
  mcpServers: McpServer[];
  mcpServersLoading: boolean;

  toggleXyzen: () => void;
  openXyzen: () => void;
  closeXyzen: () => void;
  setPanelWidth: (width: number) => void;
  setActiveChatChannel: (channelUUID: string | null) => void;
  setTabIndex: (index: number) => void;
  setTheme: (theme: Theme) => void;
  setBackendUrl: (url: string) => void;

  fetchChatHistory: () => Promise<void>;
  togglePinChat: (chatId: string) => void;
  activateChannel: (topicId: string) => void;
  connectToChannel: (sessionId: string, topicId: string) => void;
  disconnectFromChannel: () => void;
  sendMessage: (message: string) => void;
  createDefaultChannel: (agentId?: string) => Promise<void>;

  fetchAgents: () => Promise<void>;
  createAgent: (agent: Omit<Agent, "id">) => Promise<void>;
  updateAgent: (agent: Agent) => Promise<void>;
  deleteAgent: (id: string) => Promise<void>;

  fetchMcpServers: () => Promise<void>;
  addMcpServer: (server: McpServerCreate) => Promise<void>;
  editMcpServer: (
    id: number,
    server: Partial<McpServerCreate>,
  ) => Promise<void>;
  removeMcpServer: (id: number) => Promise<void>;
  updateMcpServerInList: (server: McpServer) => void;
}

// --- Mock Data ---
const mockUser: User = {
  username: "Harvey",
  avatar: `https://i.pravatar.cc/40?u=harvey`,
};

// --- End Mock Data ---

export const useXyzen = create<XyzenState>()(
  persist(
    immer((set, get) => ({
      // --- State ---
      backendUrl: "",
      isXyzenOpen: false,
      panelWidth: 380,
      activeChatChannel: null,
      user: mockUser,
      activeTabIndex: 0,
      theme: "system",
      chatHistory: [],
      chatHistoryLoading: true,
      channels: {},
      agents: [],
      agentsLoading: false,
      mcpServers: [],
      mcpServersLoading: false,

      // --- Actions ---
      toggleXyzen: () => set((state) => ({ isXyzenOpen: !state.isXyzenOpen })),
      openXyzen: () => set({ isXyzenOpen: true }),
      closeXyzen: () => set({ isXyzenOpen: false }),
      setPanelWidth: (width) => set({ panelWidth: width }),
      setActiveChatChannel: (channelId) =>
        set({ activeChatChannel: channelId }),
      setTabIndex: (index) => set({ activeTabIndex: index }),
      setTheme: (theme) => set({ theme }),
      setBackendUrl: (url) => {
        set({ backendUrl: url });
        xyzenService.setBackendUrl(url);
      },

      // --- Async Actions ---
      fetchChatHistory: async () => {
        set({ chatHistoryLoading: true });
        try {
          const response = await fetch(`${get().backendUrl}/api/v1/sessions/`);
          if (!response.ok) {
            throw new Error("Failed to fetch chat history");
          }
          const history: SessionResponse[] = await response.json();

          // Transform the fetched data into the format expected by the store
          const channels: Record<string, ChatChannel> = {};
          const chatHistory: ChatHistoryItem[] = history.flatMap(
            (session: SessionResponse) =>
              session.topics.map((topic: TopicResponse) => {
                channels[topic.id] = {
                  id: topic.id,
                  sessionId: session.id,
                  title: topic.name,
                  messages: [], // Messages will be fetched on demand or via WebSocket
                  connected: false,
                  error: null,
                };
                return {
                  id: topic.id,
                  title: topic.name,
                  updatedAt: topic.updated_at,
                  assistantTitle: "通用助理", // Placeholder
                  lastMessage: "", // Placeholder
                  isPinned: false, // Placeholder
                };
              }),
          );

          set({
            chatHistory,
            channels,
            chatHistoryLoading: false,
            activeChatChannel:
              chatHistory.length > 0 ? chatHistory[0].id : null,
          });

          if (chatHistory.length > 0) {
            const activeChannel = channels[chatHistory[0].id];
            get().disconnectFromChannel();
            get().connectToChannel(activeChannel.sessionId, activeChannel.id);
          }
        } catch (error) {
          console.error("Failed to fetch chat history:", error);
          set({ chatHistoryLoading: false });
        }
      },

      togglePinChat: (chatId: string) => {
        set((state) => {
          const chat = state.chatHistory.find((c) => c.id === chatId);
          if (chat) {
            chat.isPinned = !chat.isPinned;
          }
        });
      },

      activateChannel: (topicId: string) => {
        const { channels, activeChatChannel, connectToChannel } = get();
        if (topicId !== activeChatChannel) {
          set({ activeChatChannel: topicId });
          const channel = channels[topicId];
          if (channel && !channel.connected) {
            connectToChannel(channel.sessionId, channel.id);
          }
        }
      },

      connectToChannel: (sessionId: string, topicId: string) => {
        xyzenService.connect(
          sessionId,
          topicId,
          (message) => {
            set((state) => {
              const channel = state.channels[topicId];
              if (channel) {
                // Check for duplicate messages
                if (!channel.messages.some((m) => m.id === message.id)) {
                  channel.messages.push(message);
                }
              }
            });
          },
          (status) => {
            set((state) => {
              const channel = state.channels[topicId];
              if (channel) {
                channel.connected = status.connected;
                channel.error = status.error;
              }
            });
          },
        );
      },

      disconnectFromChannel: () => {
        xyzenService.disconnect();
      },

      sendMessage: (message: string) => {
        const { activeChatChannel } = get();
        if (activeChatChannel) {
          xyzenService.sendMessage(message);
        }
      },

      createDefaultChannel: async (agentId) => {
        try {
          const response = await fetch(`${get().backendUrl}/api/v1/sessions/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: "New Session",
              username: get().user?.username || "default-user",
              agent_id: agentId,
            }),
          });

          if (!response.ok) {
            throw new Error("Failed to create new session with default topic");
          }

          const newSession = await response.json();

          // After creating a session, refetch the history to get all new data
          await get().fetchChatHistory();

          // Activate the newly created topic
          if (newSession.topics && newSession.topics.length > 0) {
            const newTopicId = newSession.topics[0].id;
            set({ activeChatChannel: newTopicId, activeTabIndex: 1 });
            get().connectToChannel(newSession.id, newTopicId);
          }
        } catch (error) {
          console.error("Failed to create new channel:", error);
        }
      },

      fetchAgents: async () => {
        set({ agentsLoading: true });
        try {
          const response = await fetch(`${get().backendUrl}/api/v1/agents/`);
          if (!response.ok) {
            throw new Error("Failed to fetch agents");
          }
          const agents: Agent[] = await response.json();
          set({ agents, agentsLoading: false });
        } catch (error) {
          console.error("Failed to fetch agents:", error);
          set({ agentsLoading: false });
          throw error;
        }
      },

      createAgent: async (agent) => {
        try {
          const response = await fetch(`${get().backendUrl}/api/v1/agents/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(agent),
          });
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to create agent: ${errorText}`);
          }
          await get().fetchAgents();
        } catch (error) {
          console.error(error);
          throw error;
        }
      },

      updateAgent: async (agent) => {
        try {
          const response = await fetch(
            `${get().backendUrl}/api/v1/agents/${agent.id}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(agent),
            },
          );
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to update agent: ${errorText}`);
          }
          await get().fetchAgents();
        } catch (error) {
          console.error(error);
          throw error;
        }
      },

      deleteAgent: async (id) => {
        try {
          const response = await fetch(
            `${get().backendUrl}/api/v1/agents/${id}`,
            {
              method: "DELETE",
            },
          );
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to delete agent: ${errorText}`);
          }
          await get().fetchAgents();
        } catch (error) {
          console.error(error);
          throw error;
        }
      },

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
          set((state) => {
            state.mcpServers.push(newServer);
          });
        } catch (error) {
          console.error("Failed to add MCP server:", error);
        }
      },

      editMcpServer: async (id, server) => {
        try {
          const updatedServer = await mcpService.updateMcpServer(id, server);
          set((state) => {
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
          set((state) => {
            state.mcpServers = state.mcpServers.filter((s) => s.id !== id);
          });
        } catch (error) {
          console.error("Failed to remove MCP server:", error);
        }
      },

      updateMcpServerInList: (server) => {
        set((state) => {
          const index = state.mcpServers.findIndex((s) => s.id === server.id);
          if (index !== -1) {
            state.mcpServers[index] = server;
          } else {
            // If server not in list, add it
            state.mcpServers.push(server);
          }
        });
      },
    })),
    {
      name: "xyzen-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        panelWidth: state.panelWidth,
        theme: state.theme,
      }),
    },
  ),
);
