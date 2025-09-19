import { authService } from "@/service/authService";
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
  updateTopicName: (topicId: string, newName: string) => Promise<void>;
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
      console.log("ChatSlice: Starting to fetch chat history...");

      const token = authService.getToken();
      if (!token) {
        console.error("ChatSlice: No authentication token available");
        set({ chatHistoryLoading: false });
        return;
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      console.log("ChatSlice: Making request to sessions API...");
      const response = await fetch(`${get().backendUrl}/api/v1/sessions/`, {
        headers,
      });

      console.log(
        `ChatSlice: Sessions API response status: ${response.status}`,
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `ChatSlice: Sessions API error: ${response.status} - ${errorText}`,
        );
        throw new Error(
          `Failed to fetch chat history: ${response.status} ${errorText}`,
        );
      }

      const history: SessionResponse[] = await response.json();
      console.log("ChatSlice: Received sessions data:", history);

      // 获取当前的 channels 状态，避免覆盖现有的连接和消息
      const currentChannels = get().channels;
      const newChannels: Record<string, ChatChannel> = { ...currentChannels };

      const chatHistory: ChatHistoryItem[] = history.flatMap(
        (session: SessionResponse) => {
          console.log(
            `ChatSlice: Processing session ${session.id} with ${session.topics?.length || 0} topics`,
          );
          return (
            session.topics?.map((topic: TopicResponse) => {
              // 只有当频道不存在时才创建新的频道，否则保留现有状态
              if (!newChannels[topic.id]) {
                newChannels[topic.id] = {
                  id: topic.id,
                  sessionId: session.id,
                  title: topic.name,
                  messages: [],
                  connected: false,
                  error: null,
                };
              } else {
                // 更新现有频道的基本信息，但保留消息和连接状态
                newChannels[topic.id].sessionId = session.id;
                newChannels[topic.id].title = topic.name;
              }

              return {
                id: topic.id,
                title: topic.name,
                updatedAt: topic.updated_at,
                assistantTitle: "通用助理",
                lastMessage: "",
                isPinned: false,
              };
            }) || []
          );
        },
      );

      console.log(
        `ChatSlice: Processed ${chatHistory.length} chat history items`,
      );

      set({
        chatHistory,
        channels: newChannels,
        chatHistoryLoading: false,
        // 不要自动设置 activeChatChannel，保持当前选中的
      });

      console.log(
        `ChatSlice: Loaded ${chatHistory.length} chat history items, keeping current active channel`,
      );
    } catch (error) {
      console.error("ChatSlice: Failed to fetch chat history:", error);
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
        const token = authService.getToken();
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(`${backendUrl}/api/v1/sessions/`, {
          headers,
        });
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
          const token = authService.getToken();
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
          };

          if (token) {
            headers.Authorization = `Bearer ${token}`;
          }

          const response = await fetch(
            `${backendUrl}/api/v1/topics/${topicId}/messages`,
            { headers },
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
      const agentIdParam = agentId || "default";
      const token = authService.getToken();

      if (!token) {
        console.error("No authentication token available");
        return;
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      // First, try to find an existing session for this user-agent combination
      try {
        const existingSessionResponse = await fetch(
          `${get().backendUrl}/api/v1/sessions/by-agent/${agentIdParam}`,
          { headers },
        );

        if (existingSessionResponse.ok) {
          // Found existing session, create a new topic for it
          const existingSession = await existingSessionResponse.json();

          const newTopicResponse = await fetch(
            `${get().backendUrl}/api/v1/topics/`,
            {
              method: "POST",
              headers,
              body: JSON.stringify({
                name: "新的聊天",
                session_id: existingSession.id,
              }),
            },
          );

          if (!newTopicResponse.ok) {
            throw new Error("Failed to create new topic in existing session");
          }

          const newTopic = await newTopicResponse.json();

          const newChannel: ChatChannel = {
            id: newTopic.id,
            sessionId: existingSession.id,
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

          get().connectToChannel(existingSession.id, newTopic.id);
          return;
        }
      } catch {
        // If session lookup fails, we'll create a new session below
        console.log("No existing session found, creating new session");
      }

      // No existing session found, create a new session
      // The backend will automatically extract user_id from the token
      const response = await fetch(`${get().backendUrl}/api/v1/sessions/`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "New Session",
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
      console.error("Failed to create channel:", error);
    }
  },

  updateTopicName: async (topicId: string, newName: string) => {
    try {
      const token = authService.getToken();
      if (!token) {
        console.error("No authentication token available");
        return;
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      const response = await fetch(
        `${get().backendUrl}/api/v1/topics/${topicId}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({ name: newName }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update topic name");
      }

      // 更新本地状态
      set((state: XyzenState) => {
        // 更新 channels 中的标题
        if (state.channels[topicId]) {
          state.channels[topicId].title = newName;
        }

        // 更新 chatHistory 中的标题
        const chatHistoryItem = state.chatHistory.find(
          (item) => item.id === topicId,
        );
        if (chatHistoryItem) {
          chatHistoryItem.title = newName;
        }
      });

      console.log(`Topic ${topicId} name updated to: ${newName}`);
    } catch (error) {
      console.error("Failed to update topic name:", error);
      throw error;
    }
  },
});
