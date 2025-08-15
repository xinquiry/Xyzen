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
  isAddMcpServerModalOpen: boolean;

  toggleXyzen: () => void;
  openXyzen: () => void;
  closeXyzen: () => void;
  setPanelWidth: (width: number) => void;
  setActiveChatChannel: (channelUUID: string | null) => void;
  setTabIndex: (index: number) => void;
  setTheme: (theme: Theme) => void;
  setBackendUrl: (url: string) => void;
  openAddMcpServerModal: () => void;
  closeAddMcpServerModal: () => void;

  fetchChatHistory: () => Promise<void>;
  togglePinChat: (chatId: string) => void;
  activateChannel: (topicId: string) => Promise<void>;
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
      isAddMcpServerModalOpen: false,

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
      openAddMcpServerModal: () => set({ isAddMcpServerModalOpen: true }),
      closeAddMcpServerModal: () => set({ isAddMcpServerModalOpen: false }),

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
            // Use the async activateChannel method
            await get().activateChannel(chatHistory[0].id);
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

      activateChannel: async (topicId: string) => {
        const { channels, activeChatChannel, connectToChannel, backendUrl } =
          get();

        // Prevent re-activating the same channel if it's already active and connected
        if (topicId === activeChatChannel && channels[topicId]?.connected) {
          return;
        }

        set({ activeChatChannel: topicId });
        let channel = channels[topicId];

        // If channel doesn't exist in memory, we need to create it.
        if (!channel) {
          try {
            const response = await fetch(`${backendUrl}/api/v1/sessions/`);
            if (!response.ok) throw new Error("Failed to fetch sessions");

            const sessions: SessionResponse[] = await response.json();
            let sessionId = null;
            let topicName = null;

            for (const session of sessions) {
              const topic = session.topics.find((t) => t.id === topicId);
              if (topic) {
                sessionId = session.id;
                topicName = topic.name;
                break;
              }
            }

            if (sessionId && topicName) {
              channel = {
                id: topicId,
                sessionId: sessionId,
                title: topicName,
                messages: [],
                connected: false,
                error: null,
              };
              set((state) => {
                state.channels[topicId] = channel!;
              });
            } else {
              console.error(
                `Topic ${topicId} not found in any session, refetching history...`,
              );
              // Refetch history and try to activate again, this might happen due to race conditions
              await get().fetchChatHistory();
              const newChannels = get().channels;
              if (newChannels[topicId]) {
                channel = newChannels[topicId];
              } else {
                console.error(
                  `Topic ${topicId} still not found after refetch.`,
                );
                return;
              }
            }
          } catch (error) {
            console.error("Failed to find session for topic:", error);
            return;
          }
        }

        // Now that we have the channel, load messages and connect
        if (channel) {
          // Load historical messages if they haven't been loaded yet
          if (channel.messages.length === 0) {
            try {
              const response = await fetch(
                `${backendUrl}/api/v1/topics/${topicId}/messages`,
              );
              if (response.ok) {
                const messages = await response.json();
                set((state) => {
                  if (state.channels[topicId]) {
                    state.channels[topicId].messages = messages;
                  }
                });
              }
            } catch (error) {
              console.error("Failed to load topic messages:", error);
            }
          }

          // Connect to the WebSocket
          connectToChannel(channel.sessionId, channel.id);
        }
      },

      connectToChannel: (sessionId: string, topicId: string) => {
        // Disconnect from any existing connection first
        xyzenService.disconnect();

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

          const newSession: SessionResponse = await response.json();

          if (newSession.topics && newSession.topics.length > 0) {
            const newTopic = newSession.topics[0];

            // Create the new channel object directly from the response
            const newChannel: ChatChannel = {
              id: newTopic.id,
              sessionId: newSession.id,
              title: newTopic.name,
              messages: [],
              connected: false,
              error: null,
            };

            // Create the new history item
            const newHistoryItem: ChatHistoryItem = {
              id: newTopic.id,
              title: newTopic.name,
              updatedAt: newTopic.updated_at,
              assistantTitle: "通用助理", // Placeholder, consider getting from agent
              lastMessage: "",
              isPinned: false,
            };

            // Update state in one go
            set((state) => {
              state.channels[newTopic.id] = newChannel;
              state.chatHistory.unshift(newHistoryItem); // Add to the top of the list
              state.activeChatChannel = newTopic.id;
              state.activeTabIndex = 1; // Switch to chat tab
            });

            // Now, just connect to the newly created and activated channel
            get().connectToChannel(newSession.id, newTopic.id);
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
          get().closeAddMcpServerModal(); // Close modal on success
        } catch (error) {
          console.error("Failed to add MCP server:", error);
          throw error; // Re-throw to handle in component
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
        isXyzenOpen: state.isXyzenOpen,
        panelWidth: state.panelWidth,
        theme: state.theme,
      }),
    },
  ),
);
