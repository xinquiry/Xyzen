import type {
  AgentSlice,
  AuthSlice,
  ChatSlice,
  LoadingSlice,
  McpSlice,
  ProviderSlice,
  UiSlice,
} from "./slices";

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
  id?: string;
  username: string;
  avatar: string;
}

export type Theme = "light" | "dark" | "system";

// Add types for API response
export interface TopicResponse {
  id: string;
  name: string;
  updated_at: string;
}

export interface SessionResponse {
  id: string;
  name: string;
  user_id: string;
  topics: TopicResponse[];
}

export type XyzenState = UiSlice &
  ChatSlice &
  AgentSlice &
  McpSlice &
  ProviderSlice &
  AuthSlice &
  LoadingSlice;
