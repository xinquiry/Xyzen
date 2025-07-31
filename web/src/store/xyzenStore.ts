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

interface XyzenState {
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

const mockChannels: Record<string, ChatChannel> = {
  "topic-1": {
    id: "topic-1",
    sessionId: "session-1",
    title: "讨论Zustand",
    assistantId: "asst_2",
    connected: true,
    error: null,
    messages: [
      {
        id: "msg-1",
        sender: "user",
        content: "如何使用Zustand？",
        timestamp: new Date().toISOString(),
      },
      {
        id: "msg-2",
        sender: "assistant",
        content: "Zustand 是一个小型、快速、可扩展的轻量级状态管理解决方案。",
        timestamp: new Date().toISOString(),
      },
    ],
  },
  "topic-2": {
    id: "topic-2",
    sessionId: "session-1",
    title: "一个空对话",
    connected: false,
    error: null,
    messages: [],
  },
};

const mockChatHistory: ChatHistoryItem[] = [
  {
    id: "topic-1",
    title: "讨论Zustand",
    updatedAt: new Date().toISOString(),
    assistantTitle: "代码助手",
    lastMessage: "Zustand 是一个小型、快速...",
    isPinned: true,
  },
  {
    id: "topic-2",
    title: "一个空对话",
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    assistantTitle: "通用助理",
    lastMessage: "...",
    isPinned: false,
  },
];
// --- End Mock Data ---

export const useXyzen = create(
  persist(
    immer<XyzenState>((set, get) => ({
      isXyzenOpen: true,
      panelWidth: 380,
      activeChatChannel: null,
      user: mockUser,
      activeTabIndex: 0,
      theme: "system",
      chatHistory: [],
      chatHistoryLoading: true,
      channels: {},
      assistants: mockAssistants,

      toggleXyzen: () => set((state) => ({ isXyzenOpen: !state.isXyzenOpen })),
      openXyzen: () => set({ isXyzenOpen: true }),
      closeXyzen: () => set({ isXyzenOpen: false }),
      setPanelWidth: (width) => set({ panelWidth: width }),
      setActiveChatChannel: (channelUUID) => {
        set({ activeChatChannel: channelUUID });
      },
      setTabIndex: (index) => set({ activeTabIndex: index }),
      setTheme: (theme) => set({ theme }),

      fetchChatHistory: async () => {
        set({ chatHistoryLoading: true });
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 模拟网络延迟
        set({
          chatHistory: mockChatHistory,
          chatHistoryLoading: false,
          channels: mockChannels,
          activeChatChannel: "topic-1", // 默认激活第一个对话
        });
        // Auto-connect to the active channel after fetching history
        const activeChannel = get().channels["topic-1"];
        if (activeChannel) {
          get().connectToChannel(activeChannel.sessionId, activeChannel.id);
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
          const response = await fetch(
            "http://localhost:48196/api/v1/sessions/",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name: "New Session",
                username: get().user?.username || "default_user", // Get username from state
              }),
            },
          );

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
