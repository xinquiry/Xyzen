import xyzenService from "@/service/xyzenService";
import type { StateCreator } from "zustand";
import type {
  ChatChannel,
  ChatHistoryItem,
  SessionResponse,
  TopicResponse,
  XyzenState,
} from "../types";

export interface ChatSlice {
  activeChatChannel: string | null;
  chatHistory: ChatHistoryItem[];
  chatHistoryLoading: boolean;
  channels: Record<string, ChatChannel>;

  setActiveChatChannel: (channelUUID: string | null) => void;
  fetchChatHistory: () => Promise<void>;
  togglePinChat: (chatId: string) => void;
  activateChannel: (topicId: string) => Promise<void>;
  connectToChannel: (sessionId: string, topicId: string) => void;
  disconnectFromChannel: () => void;
  sendMessage: (message: string) => void;
  createDefaultChannel: (agentId?: string) => Promise<void>;
}

export const createChatSlice: StateCreator<
  XyzenState,
  [["zustand/immer", never]],
  [],
  ChatSlice
> = (set, get) => ({
  activeChatChannel: null,
  chatHistory: [],
  chatHistoryLoading: true,
  channels: {},

  setActiveChatChannel: (channelId) => set({ activeChatChannel: channelId }),

  fetchChatHistory: async () => {
    set({ chatHistoryLoading: true });
    try {
      const response = await fetch(`${get().backendUrl}/api/v1/sessions/`);
      if (!response.ok) {
        throw new Error("Failed to fetch chat history");
      }
      const history: SessionResponse[] = await response.json();

      const channels: Record<string, ChatChannel> = {};
      const chatHistory: ChatHistoryItem[] = history.flatMap(
        (session: SessionResponse) =>
          session.topics.map((topic: TopicResponse) => {
            channels[topic.id] = {
              id: topic.id,
              sessionId: session.id,
              title: topic.name,
              messages: [],
              connected: false,
              error: null,
            };
            return {
              id: topic.id,
              title: topic.name,
              updatedAt: topic.updated_at,
              assistantTitle: "通用助理",
              lastMessage: "",
              isPinned: false,
            };
          }),
      );

      set({
        chatHistory,
        channels,
        chatHistoryLoading: false,
        activeChatChannel: chatHistory.length > 0 ? chatHistory[0].id : null,
      });

      if (chatHistory.length > 0) {
        await get().activateChannel(chatHistory[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch chat history:", error);
      set({ chatHistoryLoading: false });
    }
  },

  togglePinChat: (chatId: string) => {
    set((state: ChatSlice) => {
      const chat = state.chatHistory.find((c) => c.id === chatId);
      if (chat) {
        chat.isPinned = !chat.isPinned;
      }
    });
  },

  activateChannel: async (topicId: string) => {
    const { channels, activeChatChannel, connectToChannel, backendUrl } = get();

    if (topicId === activeChatChannel && channels[topicId]?.connected) {
      return;
    }

    set({ activeChatChannel: topicId });
    let channel = channels[topicId];

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
          set((state: ChatSlice) => {
            state.channels[topicId] = channel!;
          });
        } else {
          console.error(
            `Topic ${topicId} not found in any session, refetching history...`,
          );
          await get().fetchChatHistory();
          const newChannels = get().channels;
          if (newChannels[topicId]) {
            channel = newChannels[topicId];
          } else {
            console.error(`Topic ${topicId} still not found after refetch.`);
            return;
          }
        }
      } catch (error) {
        console.error("Failed to find session for topic:", error);
        return;
      }
    }

    if (channel) {
      if (channel.messages.length === 0) {
        try {
          const response = await fetch(
            `${backendUrl}/api/v1/topics/${topicId}/messages`,
          );
          if (response.ok) {
            const messages = await response.json();
            set((state: ChatSlice) => {
              if (state.channels[topicId]) {
                state.channels[topicId].messages = messages;
              }
            });
          }
        } catch (error) {
          console.error("Failed to load topic messages:", error);
        }
      }
      connectToChannel(channel.sessionId, channel.id);
    }
  },

  connectToChannel: (sessionId: string, topicId: string) => {
    xyzenService.disconnect();
    xyzenService.connect(
      sessionId,
      topicId,
      (message) => {
        set((state: ChatSlice) => {
          const channel = state.channels[topicId];
          if (channel) {
            if (!channel.messages.some((m) => m.id === message.id)) {
              channel.messages.push(message);
            }
          }
        });
      },
      (status) => {
        set((state: ChatSlice) => {
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
          user_id: get().user?.id || get().user?.username || "default-user",
          agent_id: agentId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create new session with default topic");
      }

      const newSession: SessionResponse = await response.json();

      if (newSession.topics && newSession.topics.length > 0) {
        const newTopic = newSession.topics[0];

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
          assistantTitle: "通用助理",
          lastMessage: "",
          isPinned: false,
        };

        set((state: XyzenState) => {
          state.channels[newTopic.id] = newChannel;
          state.chatHistory.unshift(newHistoryItem);
          state.activeChatChannel = newTopic.id;
          state.activeTabIndex = 1;
        });

        get().connectToChannel(newSession.id, newTopic.id);
      }
    } catch (error) {
      console.error("Failed to create new channel:", error);
    }
  },
});
