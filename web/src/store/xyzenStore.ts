import xyzenService from "@/service/xyzenService";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// 定义应用中的核心类型
export interface Message {
  id: string;
  content: string;
  sender: "user" | "assistant" | "system";
  timestamp: string; // This should be created_at from the backend
  role?: string; // Add role to match backend
  created_at?: string; // Add created_at to match backend
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

export interface Assistant {
  id: string;
  title: string;
  description: string;
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
  assistants: Assistant[];

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
  createDefaultChannel: () => Promise<void>;
}

// --- Mock Data ---
const mockUser: User = {
  username: "Harvey",
  avatar: `https://i.pravatar.cc/40?u=harvey`,
};

const mockAssistants: Assistant[] = [
  {
    id: "asst_1",
    title: "通用助理",
    description: "我可以回答各种问题。",
  },
  {
    id: "asst_2",
    title: "代码助手",
    description: "我可以帮助你处理代码相关的任务。",
  },
];

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
      assistants: mockAssistants,

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
          const chat = state.chatHistory.find(
            (c: ChatHistoryItem) => c.id === chatId,
          );
          if (chat) {
            chat.isPinned = !chat.isPinned;
          }
        });
      },

      activateChannel: async (topicId: string) => {
        const state = get();

        // If we are already connected to this channel, just switch to the chat tab
        if (
          state.activeChatChannel === topicId &&
          state.channels[topicId]?.connected
        ) {
          set({ activeTabIndex: 0 });
          return;
        }

        // Disconnect from any existing connection
        state.disconnectFromChannel();

        const channelToActivate = state.channels[topicId];

        if (channelToActivate) {
          // Set the new active channel immediately for UI feedback
          set({ activeChatChannel: topicId, activeTabIndex: 0 });

          // Fetch and load historical messages for this channel
          try {
            const response = await fetch(
              `${get().backendUrl}/api/v1/topics/${topicId}/messages`,
            );
            if (!response.ok) {
              throw new Error("Failed to fetch messages for the topic.");
            }
            const messages: Message[] = await response.json();
            set((state) => {
              const channel = state.channels[topicId];
              if (channel) {
                channel.messages = messages;
              }
            });
          } catch (error) {
            console.error("Error fetching historical messages:", error);
            set((state) => {
              const channel = state.channels[topicId];
              if (channel) {
                channel.error = "Failed to load messages.";
              }
            });
          }

          // Connect to the new channel
          state.connectToChannel(
            channelToActivate.sessionId,
            channelToActivate.id,
          );
        } else {
          console.error(
            `Could not find channel details for topicId: ${topicId}`,
          );
        }
      },

      connectToChannel: (sessionId, topicId) => {
        xyzenService.connect(
          sessionId,
          topicId,
          (incomingMessage) => {
            // onMessage callback
            set((state) => {
              const channel = state.channels[topicId];
              if (
                channel &&
                incomingMessage.role &&
                incomingMessage.created_at
              ) {
                // The incoming message is now the full Message object from the backend
                const newMsg: Message = {
                  id: incomingMessage.id,
                  sender: incomingMessage.role as "user" | "assistant", // 'user' or 'assistant'
                  content: incomingMessage.content,
                  timestamp: incomingMessage.created_at,
                  role: incomingMessage.role,
                  created_at: incomingMessage.created_at,
                };
                channel.messages.push(newMsg);

                // Also update the chat history for real-time sorting
                const historyItem = state.chatHistory.find(
                  (h) => h.id === topicId,
                );
                if (historyItem) {
                  historyItem.lastMessage = incomingMessage.content;
                  historyItem.updatedAt = incomingMessage.created_at;
                }
              }
            });
          },
          (status) => {
            // onStatusChange callback
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

      sendMessage: (message) => {
        const channelId = get().activeChatChannel;
        if (!channelId) return;

        const userMessage: Message = {
          id: `msg-${Date.now()}`,
          sender: "user",
          content: message,
          timestamp: new Date().toISOString(),
        };

        set((state) => {
          const channel = state.channels[channelId];
          if (channel) {
            channel.messages.push(userMessage);
          }
          // Also update the chat history for real-time sorting
          const historyItem = state.chatHistory.find((h) => h.id === channelId);
          if (historyItem) {
            historyItem.lastMessage = message;
            historyItem.updatedAt = new Date().toISOString();
          }
        });

        xyzenService.sendMessage(message);
      },

      createDefaultChannel: async () => {
        try {
          // Step 1: Call the backend to create a new session and a default topic
          const response = await fetch(`${get().backendUrl}/api/v1/sessions/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: "New Session",
              username: get().user?.username || "default_user", // Get username from state
            }),
          });

          if (!response.ok) {
            throw new Error("Failed to create a new session on the backend.");
          }

          const newSession = await response.json();
          const newTopic = newSession.topics[0]; // Assuming the first topic is the default one

          if (!newTopic) {
            throw new Error("Backend did not return a default topic.");
          }

          const newChannel: ChatChannel = {
            id: newTopic.id,
            sessionId: newSession.id,
            title: newTopic.name,
            messages: [],
            connected: false,
            error: null,
          };

          const newHistoryItem: ChatHistoryItem = {
            id: newTopic.id,
            title: newTopic.name,
            updatedAt: newTopic.updated_at,
            assistantTitle: "通用助理", // Or derive from session/topic
            lastMessage: "",
            isPinned: false,
          };

          set((state) => {
            state.channels[newTopic.id] = newChannel;
            state.chatHistory.unshift(newHistoryItem);
            state.activeChatChannel = newTopic.id;
            state.activeTabIndex = 0; // Switch to the chat tab
          });

          // Step 2: Activate the new channel, which handles disconnection and connection
          get().activateChannel(newTopic.id);
        } catch (error) {
          console.error("Error creating default channel:", error);
          // Optionally, update the state to show an error to the user
        }
      },
    })),
    {
      name: "xyzen-storage", // local storage key
      partialize: (state) => ({
        panelWidth: state.panelWidth,
        isXyzenOpen: state.isXyzenOpen,
        theme: state.theme,
      }), // only persist panelWidth and isXyzenOpen
    },
  ),
);
