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
  id: string;
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
  sendMessage: (payload: { channelUUID: string; message: string }) => void;
  createDefaultChannel: () => void;
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
  "channel-1": {
    id: "channel-1",
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
  "channel-2": {
    id: "channel-2",
    title: "一个空对话",
    connected: true,
    error: null,
    messages: [],
  },
};

const mockChatHistory: ChatHistoryItem[] = [
  {
    id: "channel-1",
    title: "讨论Zustand",
    updatedAt: new Date().toISOString(),
    assistantTitle: "代码助手",
    lastMessage: "Zustand 是一个小型、快速...",
    isPinned: true,
  },
  {
    id: "channel-2",
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
    immer<XyzenState>((set) => ({
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
          activeChatChannel: "channel-1", // 默认激活第一个对话
        });
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

      sendMessage: async (payload) => {
        const { channelUUID, message } = payload;
        const newMessage: Message = {
          id: `msg-${Date.now()}`,
          sender: "user",
          content: message,
          timestamp: new Date().toISOString(),
        };

        set((state) => {
          state.channels[channelUUID]?.messages.push(newMessage);
        });

        // 模拟助手回复
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const assistantResponse: Message = {
          id: `msg-${Date.now()}`,
          sender: "assistant",
          content: `这是对以下消息的模拟回复: "${message}"`,
          timestamp: new Date().toISOString(),
        };
        set((state) => {
          state.channels[channelUUID]?.messages.push(assistantResponse);
        });
      },

      createDefaultChannel: () => {
        const newId = `channel-${Date.now()}`;
        const newChannel: ChatChannel = {
          id: newId,
          title: "新对话",
          messages: [],
          connected: true,
          error: null,
        };
        const newHistoryItem: ChatHistoryItem = {
          id: newId,
          title: "新对话",
          updatedAt: new Date().toISOString(),
          assistantTitle: "通用助理",
          lastMessage: "",
          isPinned: false,
        };

        set((state) => {
          state.channels[newId] = newChannel;
          state.chatHistory.unshift(newHistoryItem);
          state.activeChatChannel = newId;
          state.activeTabIndex = 0; // 创建后切换到聊天标签页
        });
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
