"use client";

import EditableTitle from "@/components/base/EditableTitle";
import { LoadingSpinner } from "@/components/base/LoadingSpinner";
import ConfirmationModal from "@/components/modals/ConfirmationModal";
import { formatTime } from "@/lib/formatDate";
import { useXyzen } from "@/store";
import type { ChatHistoryItem } from "@/store/types";
import { MapPinIcon } from "@heroicons/react/20/solid";
import {
  ArchiveBoxXMarkIcon,
  ChevronRightIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  UserIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

/**
 * XyzenTopics - Topic/Session list component for fullscreen layout
 * Displays topics grouped by sessions with management capabilities
 */
export default function XyzenTopics() {
  const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
  const [topicToDelete, setTopicToDelete] = useState<ChatHistoryItem | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  const {
    chatHistory,
    chatHistoryLoading,
    activeChatChannel,
    channels,
    activateChannel,
    togglePinChat,
    user,
    fetchChatHistory,
    updateTopicName,
    deleteTopic,
    createDefaultChannel,
    clearSessionTopics,
  } = useXyzen();

  // Load chat history on mount
  useEffect(() => {
    fetchChatHistory();
  }, [fetchChatHistory]);

  // Check if user is logged in
  const isUserLoggedIn = useMemo(() => {
    const hasUser = user && (user.id || user.username);
    return hasUser;
  }, [user]);

  // Get current session topics
  const currentSessionTopics = useMemo(() => {
    if (!activeChatChannel || !channels[activeChatChannel]) {
      return [];
    }

    const currentSessionId = channels[activeChatChannel].sessionId;
    return chatHistory.filter((chat) => {
      const channel = channels[chat.id];
      return channel && channel.sessionId === currentSessionId;
    });
  }, [activeChatChannel, channels, chatHistory]);

  // Filter topics by search query
  const filteredTopics = useMemo(() => {
    if (!searchQuery.trim()) {
      return currentSessionTopics;
    }

    const query = searchQuery.toLowerCase();
    return currentSessionTopics.filter(
      (topic) =>
        topic.title.toLowerCase().includes(query) ||
        topic.lastMessage?.toLowerCase().includes(query),
    );
  }, [currentSessionTopics, searchQuery]);

  // Sort topics by pinned status and update time
  const sortedTopics = [...filteredTopics].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    const dateA = new Date(a.updatedAt);
    const dateB = new Date(b.updatedAt);
    return dateB.getTime() - dateA.getTime();
  });

  // Activate a topic
  const handleActivateTopic = async (topicId: string) => {
    await activateChannel(topicId);
  };

  // Toggle pin status
  const handleTogglePin = (e: React.MouseEvent, topicId: string) => {
    e.stopPropagation();
    togglePinChat(topicId);
  };

  // Handle delete topic
  const handleDeleteTopic = (e: React.MouseEvent, topic: ChatHistoryItem) => {
    e.stopPropagation();

    // Prevent deleting the last topic
    if (sortedTopics.length <= 1) {
      return;
    }

    setTopicToDelete(topic);
    setConfirmModalOpen(true);
  };

  // Confirm deletion
  const confirmDelete = async () => {
    if (topicToDelete) {
      await deleteTopic(topicToDelete.id);
      setTopicToDelete(null);
      setConfirmModalOpen(false);
    }
  };

  // Handle topic name update
  const handleTopicNameUpdate = async (topicId: string, newName: string) => {
    await updateTopicName(topicId, newName);
  };

  // Create new topic
  const handleCreateNewTopic = async () => {
    if (!activeChatChannel || !channels[activeChatChannel]) return;
    const currentAgent = channels[activeChatChannel].agentId;
    await createDefaultChannel(currentAgent);
  };

  // Clear all topics
  const handleClearAllTopics = () => {
    setIsClearConfirmOpen(true);
  };

  const confirmClearAll = async () => {
    if (activeChatChannel && channels[activeChatChannel]) {
      const sessionId = channels[activeChatChannel].sessionId;
      await clearSessionTopics(sessionId);
      setIsClearConfirmOpen(false);
    }
  };

  // Render login prompt
  if (!isUserLoggedIn) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <UserIcon className="h-16 w-16 text-neutral-300 dark:text-neutral-600" />
        <h3 className="mt-4 text-lg font-medium text-neutral-800 dark:text-white">
          Please Login
        </h3>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Login to view and manage your topics
        </p>
      </div>
    );
  }

  // Render loading state
  if (chatHistoryLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Render empty state
  if (sortedTopics.length === 0 && !searchQuery) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <ClockIcon className="h-16 w-16 text-neutral-300 dark:text-neutral-600" />
        <h3 className="mt-4 text-lg font-medium text-neutral-800 dark:text-white">
          No Topics Yet
        </h3>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Start a conversation to create your first topic
        </p>
      </div>
    );
  }

  // Render topics list
  return (
    <>
      <div className="flex h-full flex-col bg-white dark:bg-neutral-950">
        {/* Header */}
        <div className="border-b border-neutral-200 p-4 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
                Topics
              </h2>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                {currentSessionTopics.length}{" "}
                {currentSessionTopics.length === 1 ? "topic" : "topics"}
                {searchQuery && ` · ${sortedTopics.length} 个搜索结果`}
              </p>
            </div>
            <button
              onClick={handleCreateNewTopic}
              className="flex items-center gap-1 rounded-sm bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              title="Create new topic"
            >
              <PlusIcon className="h-4 w-4" />
              New
            </button>
          </div>
        </div>

        {/* Toolbar: Search and Clear */}
        <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="搜索对话..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-sm border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm text-neutral-800 placeholder-neutral-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder-neutral-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Clear All Button */}
            <button
              onClick={handleClearAllTopics}
              className="flex items-center gap-1.5 rounded-sm border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition-colors hover:bg-red-50 hover:border-red-200 hover:text-red-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-red-950/30 dark:hover:border-red-800 dark:hover:text-red-400"
              title="清空所有对话"
            >
              <ArchiveBoxXMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Topics List */}
        <div className="flex-1 overflow-y-auto p-2">
          {sortedTopics.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <MagnifyingGlassIcon className="h-12 w-12 text-neutral-300 dark:text-neutral-600" />
              <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
                没有找到匹配的对话
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {sortedTopics.map((topic) => (
                <motion.div
                  key={topic.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`group relative flex cursor-pointer items-center justify-between rounded-sm border p-3 transition-all hover:shadow-sm ${
                    topic.id === activeChatChannel
                      ? "border-indigo-300 bg-indigo-50 shadow-sm dark:border-indigo-700 dark:bg-indigo-950/30"
                      : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 dark:hover:bg-neutral-800"
                  }`}
                >
                  <div
                    className="flex-1 overflow-hidden"
                    onClick={() => handleActivateTopic(topic.id)}
                  >
                    <div className="flex items-center gap-2">
                      {topic.isPinned && (
                        <MapPinIcon className="h-3.5 w-3.5 flex-shrink-0 rotate-45 text-indigo-500 dark:text-indigo-400" />
                      )}
                      <div className="flex-1 overflow-hidden">
                        <EditableTitle
                          title={topic.title}
                          onSave={(newTitle) =>
                            handleTopicNameUpdate(topic.id, newTitle)
                          }
                          textClassName="text-sm font-medium text-neutral-800 dark:text-white truncate"
                          className=""
                        />
                      </div>
                      {/* {topic.id === activeChatChannel && (
                      <Badge variant="blue" className="text-[10px]">
                        Active
                      </Badge>
                    )} */}
                    </div>

                    <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                      <span>{formatTime(topic.updatedAt)}</span>
                      {topic.lastMessage && (
                        <>
                          <span>•</span>
                          <span className="truncate">{topic.lastMessage}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="ml-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      className={`rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-red-700 dark:hover:bg-neutral-800 dark:hover:text-red-400 ${
                        sortedTopics.length <= 1
                          ? "cursor-not-allowed opacity-50"
                          : ""
                      }`}
                      title={
                        sortedTopics.length <= 1
                          ? "Cannot delete last topic"
                          : "Delete topic"
                      }
                      onClick={(e) => handleDeleteTopic(e, topic)}
                      disabled={sortedTopics.length <= 1}
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                      title={topic.isPinned ? "Unpin" : "Pin topic"}
                      onClick={(e) => handleTogglePin(e, topic.id)}
                    >
                      <MapPinIcon
                        className={`h-3.5 w-3.5 ${topic.isPinned ? "rotate-45" : ""}`}
                      />
                    </button>
                    <div className="rounded p-1 text-neutral-400">
                      <ChevronRightIcon className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => {
          setConfirmModalOpen(false);
          setTopicToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Topic"
        message={`Are you sure you want to delete "${topicToDelete?.title}"? This action cannot be undone.`}
      />

      {/* Clear All Confirmation Modal */}
      <ConfirmationModal
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        onConfirm={confirmClearAll}
        title="清空所有对话"
        message="确定要清空当前会话的所有对话记录吗？此操作不可恢复。"
      />
    </>
  );
}
