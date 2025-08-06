"use client";

import { formatTime } from "@/lib/formatDate";
import { type ChatHistoryItem, useXyzen } from "@/store/xyzenStore";
import { MapPinIcon } from "@heroicons/react/20/solid";
import { ChevronRightIcon, ClockIcon } from "@heroicons/react/24/outline";
import { useEffect } from "react";

export default function XyzenHistory() {
  const {
    chatHistory,
    chatHistoryLoading,
    fetchChatHistory,
    activateChannel,
    togglePinChat,
    setTabIndex,
  } = useXyzen();

  // 组件挂载时加载聊天历史
  useEffect(() => {
    fetchChatHistory();
  }, [fetchChatHistory]);

  // 根据置顶状态对聊天记录进行排序
  const sortedHistory = [...chatHistory].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    const dateA = new Date(a.updatedAt);
    const dateB = new Date(b.updatedAt);
    return dateB.getTime() - dateA.getTime();
  });

  // 激活聊天会话
  const handleActivateChat = async (chatId: string) => {
    await activateChannel(chatId);
    setTabIndex(1); // 切换到聊天标签页
  };

  // 切换置顶状态
  const handleTogglePin = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    togglePinChat(chatId);
  };

  if (chatHistoryLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-indigo-600"></div>
      </div>
    );
  }

  if (sortedHistory.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 text-center text-neutral-400">
        <ClockIcon className="h-12 w-12 opacity-50" />
        <p className="mt-4">没有聊天记录</p>
        <p className="mt-1 text-xs">创建新对话开始聊天</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 px-4">
      {sortedHistory.map((chat: ChatHistoryItem) => (
        <div
          key={chat.id}
          className="group relative flex cursor-pointer items-center justify-between rounded-lg border border-neutral-200 p-3 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
          onClick={() => handleActivateChat(chat.id)}
        >
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center">
              {chat.isPinned && (
                <MapPinIcon className="mr-1.5 h-3.5 w-3.5 rotate-45 text-indigo-500 dark:text-indigo-400" />
              )}
              <h3
                className={`truncate text-sm font-medium ${
                  chat.isPinned
                    ? "text-indigo-700 dark:text-indigo-400"
                    : "text-neutral-800 dark:text-white"
                }`}
              >
                {chat.title}
              </h3>
            </div>
            <div className="mt-1 flex items-center text-xs text-neutral-500">
              <span className="truncate">{chat.assistantTitle}</span>
              <span className="mx-1.5">·</span>
              <span className="whitespace-nowrap">
                {formatTime(chat.updatedAt)}
              </span>
            </div>
            {chat.lastMessage && (
              <p className="mt-1 truncate text-xs text-neutral-500">
                {chat.lastMessage}
              </p>
            )}
          </div>
          <div className="ml-4 flex items-center gap-2">
            <button
              className="invisible rounded p-1 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 group-hover:visible dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
              title={chat.isPinned ? "取消置顶" : "置顶会话"}
              onClick={(e) => handleTogglePin(e, chat.id)}
            >
              <MapPinIcon
                className={`h-4 w-4 ${chat.isPinned ? "rotate-45" : ""}`}
              />
            </button>
            <div className="rounded-full p-1.5 text-neutral-400 group-hover:text-neutral-500">
              <ChevronRightIcon className="h-4 w-4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
