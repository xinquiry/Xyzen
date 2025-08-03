import xyzenService from "@/service/xyzenService";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// 定义应用中的核心类型
export interface Message {
  id: string;
  content: string;
  sender: "user" | "assistant" | "system";
  timestamp: string;
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

      connectToChannel: (sessionId, topicId) => {
        xyzenService.connect(
          sessionId,
          topicId,
          (incomingMessage) => {
            // onMessage callback
            set((state) => {
              const channel = state.channels[topicId];
              if (channel) {
                const newMsg: Message = {
                  id: `msg-${Date.now()}`, // Or use an ID from the server
                  sender: incomingMessage.sender,
                  content: incomingMessage.content,
                  timestamp: new Date().toISOString(),
                };
                channel.messages.push(newMsg);
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
          state.channels[channelId]?.messages.push(userMessage);
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
            updatedAt: new Date().toISOString(),
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

          // Step 2: Connect to the WebSocket with the real IDs
          get().connectToChannel(newSession.id, newTopic.id);
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
