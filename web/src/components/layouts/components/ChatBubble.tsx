import ProfileIcon from "@/assets/ProfileIcon";
import Markdown from "@/lib/Markdown";
import { useXyzen } from "@/store";
import type { Message } from "@/store/types";
import LoadingMessage from "./LoadingMessage";
import ToolCallCard from "./ToolCallCard";

import { motion } from "framer-motion";
import React from "react";

interface ChatBubbleProps {
  message: Message;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const { confirmToolCall, cancelToolCall, activeChatChannel } = useXyzen();

  const { role, content, created_at, isLoading, isStreaming, toolCalls } =
    message;

  const isUserMessage = role === "user";

  // Debug logging for tool calls
  React.useEffect(() => {
    if (toolCalls && toolCalls.length > 0) {
      console.log(
        `ChatBubble: Message ${message.id} has ${toolCalls.length} tool calls:`,
        toolCalls,
      );
    }
  }, [toolCalls, message.id]);

  // Updated time format to include seconds
  const formattedTime = new Date(created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // Different styles for user vs AI messages
  const messageStyles = isUserMessage
    ? "border-l-4 border-blue-400 bg-blue-50/50 dark:border-blue-600 dark:bg-blue-900/20"
    : "border-l-4 border-neutral-300 bg-white dark:border-neutral-600 dark:bg-neutral-800/50";

  // Loading state styles
  const loadingStyles = isLoading
    ? "border-l-4 border-purple-400 bg-purple-50/30 dark:border-purple-500 dark:bg-purple-900/10"
    : messageStyles;

  // Streaming animation styles
  const streamingStyles = isStreaming
    ? "animate-pulse border-l-4 border-green-400 bg-green-50/30 dark:border-green-500 dark:bg-green-900/10"
    : loadingStyles;

  // 渲染头像，使用初始字母作为最后的备用选项
  const renderAvatar = () => {
    if (isUserMessage) {
      return (
        <ProfileIcon className="h-6 w-6 rounded-full text-neutral-700 dark:text-neutral-300" />
      );
    }

    // AI助手头像显示首字母
    const initial = role?.charAt(0)?.toUpperCase() || "A";

    return (
      <div
        className={`flex h-6 w-6 items-center justify-center rounded-full bg-purple-500 text-white`}
      >
        <span className="text-xs font-medium">{initial}</span>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="group relative w-full pl-8"
    >
      {/* Timestamp - hidden by default, shown on hover */}
      <div className="absolute -top-6 left-8 z-10 transform opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <span className="rounded px-2 py-1 text-xs text-neutral-500  dark:text-neutral-400">
          {formattedTime}
        </span>
      </div>

      {/* Avatar - positioned to the left */}
      <div className="absolute left-0 top-1">{renderAvatar()}</div>

      {/* Message content */}
      <div
        className={`w-full rounded-none ${streamingStyles} transition-all duration-200 hover:shadow-sm`}
      >
        <div className="p-3">
          <div
            className={`prose prose-neutral dark:prose-invert prose-sm max-w-none ${
              isUserMessage
                ? "text-sm text-neutral-800 dark:text-neutral-200"
                : "text-sm text-neutral-700 dark:text-neutral-300"
            }`}
          >
            {isLoading ? (
              <LoadingMessage />
            ) : isUserMessage ? (
              <p>{content}</p>
            ) : (
              <Markdown content={content} />
            )}
            {isStreaming && !isLoading && (
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="ml-1 inline-block h-4 w-0.5 bg-current"
              />
            )}
          </div>

          {/* Tool Calls */}
          {toolCalls && toolCalls.length > 0 && (
            <div className="mt-3 space-y-2">
              {toolCalls.map((toolCall) => (
                <ToolCallCard
                  key={toolCall.id}
                  toolCall={toolCall}
                  onConfirm={(toolCallId) =>
                    activeChatChannel &&
                    confirmToolCall(activeChatChannel, toolCallId)
                  }
                  onCancel={(toolCallId) =>
                    activeChatChannel &&
                    cancelToolCall(activeChatChannel, toolCallId)
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ChatBubble;
