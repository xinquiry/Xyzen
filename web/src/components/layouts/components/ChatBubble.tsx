import Markdown from "@/lib/Markdown";

import { motion } from "framer-motion";
import React, { useEffect, useState } from "react";

export interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  avatar?: string;
  isCurrentUser?: boolean;
}

interface ChatBubbleProps {
  message: Message;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const { isCurrentUser, content, timestamp, avatar } = message;
  const [imageError, setImageError] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string | undefined>(avatar);

  // 如果是当前用户，从localStorage获取最新的用户头像
  useEffect(() => {
    if (isCurrentUser) {
      try {
        const userInfoStr = localStorage.getItem("userInfo");
        if (userInfoStr) {
          const userInfo = JSON.parse(userInfoStr);
          if (userInfo.avatar) {
            setUserAvatar(userInfo.avatar);
          }
        }
      } catch (e) {
        console.error("Failed to get avatar from localStorage", e);
      }
    }
  }, [isCurrentUser]);

  // Updated time format to include seconds
  const formattedTime = new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // Different styles for user vs AI messages
  const messageStyles = isCurrentUser
    ? "border-l-4 border-blue-400 bg-blue-50/50 dark:border-blue-600 dark:bg-blue-900/20"
    : "border-l-4 border-neutral-300 bg-white dark:border-neutral-600 dark:bg-neutral-800/50";

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
    // 如果已经知道图像加载失败，或者没有提供头像
    if (imageError || !userAvatar) {
      // 显示用户或AI的首字母作为头像
      const initial = isCurrentUser
        ? message.sender?.charAt(0)?.toUpperCase() || "U"
        : "A";

      return (
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-full ${
            isCurrentUser
              ? "bg-blue-500 text-white"
              : "bg-purple-500 text-white"
          }`}
        >
          <span className="text-xs font-medium">{initial}</span>
        </div>
      );
    }

    // 尝试加载实际头像
    const avatarUrl = getAvatarUrl(userAvatar);
    return (
      <img
        src={avatarUrl || ""}
        alt={isCurrentUser ? "You" : "Assistant"}
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
        className={`w-full rounded-none ${messageStyles} transition-all duration-200 hover:shadow-sm`}
      >
        <div className="p-3">
          <div
            className={`prose prose-neutral dark:prose-invert prose-sm max-w-none ${
              isCurrentUser
                ? "text-sm text-neutral-800 dark:text-neutral-200"
                : "text-sm text-neutral-700 dark:text-neutral-300"
            }`}
          >
            {isCurrentUser ? <p>{content}</p> : <Markdown content={content} />}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ChatBubble;
