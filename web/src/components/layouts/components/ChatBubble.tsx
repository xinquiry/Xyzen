import ProfileIcon from "@/assets/ProfileIcon";
import Markdown from "@/lib/Markdown";
import LoadingMessage from "./LoadingMessage";

import { motion } from "framer-motion";
import React, { useState } from "react";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  created_at: string;
  avatar?: string;
  isCurrentUser?: boolean;
  isLoading?: boolean;
  isStreaming?: boolean;
}

interface ChatBubbleProps {
  message: Message;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const { role, content, created_at, avatar, isLoading, isStreaming } = message;
  const [imageError, setImageError] = useState(false);

  const isUserMessage = role === "user";

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

  // 获取头像 URL 但避免使用不存在的默认头像文件
  const getAvatarUrl = (avatarPath?: string) => {
    if (!avatarPath) return null;

    // 如果已经是完整URL就直接使用
    if (avatarPath.startsWith("http")) {
      return avatarPath;
    }

    // 如果是相对路径，根据环境添加正确的基本URL
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    return avatarPath.startsWith("/")
      ? `${baseUrl}${avatarPath}`
      : `${baseUrl}/${avatarPath}`;
  };

  // 渲染头像，使用初始字母作为最后的备用选项
  const renderAvatar = () => {
    if (isUserMessage) {
      return (
        <ProfileIcon className="h-6 w-6 rounded-full text-neutral-700 dark:text-neutral-300" />
      );
    }

    // 如果已经知道图像加载失败，或者没有提供头像
    if (imageError || !avatar) {
      // 显示AI的首字母作为头像
      const initial = role?.charAt(0)?.toUpperCase() || "A";

      return (
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-full bg-purple-500 text-white`}
        >
          <span className="text-xs font-medium">{initial}</span>
        </div>
      );
    }

    // 尝试加载实际头像
    const avatarUrl = getAvatarUrl(avatar);
    return (
      <img
        src={avatarUrl || ""}
        alt="Assistant"
        className="h-6 w-6 rounded-full shadow-sm transition-transform duration-200 group-hover:scale-110"
        onError={() => setImageError(true)} // 加载失败时设置状态，不再尝试加载图片
      />
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
        </div>
      </div>
    </motion.div>
  );
};

export default ChatBubble;
