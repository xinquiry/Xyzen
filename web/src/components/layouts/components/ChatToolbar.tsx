"use client";

import McpIcon from "@/assets/McpIcon";
import { useXyzen } from "@/store";
import {
  type DragEndEvent,
  type DragMoveEvent,
  DndContext,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { ClockIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useMemo, useRef, useState } from "react";

interface ChatToolbarProps {
  onShowHistory: () => void;
  onHeightChange?: (height: number) => void;
}

// Draggable resize handle component
const ResizeHandle = () => {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: "resize-handle",
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="absolute -top-1 left-0 right-0 -mx-2 h-1 cursor-ns-resize transition-colors hover:bg-indigo-600"
      title="拖动调整输入框高度"
    />
  );
};

export default function ChatToolbar({
  onShowHistory,
  onHeightChange,
}: ChatToolbarProps) {
  const {
    createDefaultChannel,
    activeChatChannel,
    channels,
    agents,
    mcpServers,
  } = useXyzen();

  // State for managing input height
  const [inputHeight, setInputHeight] = useState(() => {
    const savedHeight = localStorage.getItem("chatInputHeight");
    return savedHeight ? parseInt(savedHeight, 10) : 80;
  });

  // Get current channel and associated MCP tools
  const currentMcpInfo = useMemo(() => {
    if (!activeChatChannel) return null;

    const channel = channels[activeChatChannel];
    if (!channel?.agentId) return null;

    const agent = agents.find((a) => a.id === channel.agentId);
    if (!agent?.mcp_servers?.length) return null;

    const connectedServers = mcpServers.filter((server) =>
      agent.mcp_servers.some((mcpRef) => mcpRef.id === server.id),
    );

    return {
      agent,
      servers: connectedServers,
    };
  }, [activeChatChannel, channels, agents, mcpServers]);

  // Refs for drag handling
  const initialHeightRef = useRef(inputHeight);
  const dragDeltaRef = useRef(0);

  // Setup dnd sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 0,
      },
    }),
  );

  const handleNewChat = () => {
    createDefaultChannel();
  };

  // Handle drag start
  const handleDragStart = () => {
    initialHeightRef.current = inputHeight;
    dragDeltaRef.current = 0;
  };

  // Handle drag move
  const handleDragMove = (event: DragMoveEvent) => {
    const { delta } = event;
    dragDeltaRef.current = delta.y;
    const newHeight = Math.max(60, initialHeightRef.current - delta.y);
    setInputHeight(newHeight);

    // Save height and notify parent
    localStorage.setItem("chatInputHeight", newHeight.toString());
    onHeightChange?.(newHeight);
  };

  // Handle drag end
  const handleDragEnd = (_: DragEndEvent) => {
    const finalHeight = Math.max(
      60,
      initialHeightRef.current - dragDeltaRef.current,
    );
    setInputHeight(finalHeight);
    localStorage.setItem("chatInputHeight", finalHeight.toString());
    onHeightChange?.(finalHeight);
    dragDeltaRef.current = 0;
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <div className="relative">
        {/* Drag handle positioned above the toolbar */}
        <ResizeHandle />

        <div className="flex items-center justify-between bg-neutral-100/50 px-2 py-1.5 dark:bg-neutral-900/50">
          <div className="flex items-center space-x-1">
            <button
              onClick={handleNewChat}
              className="flex items-center justify-center rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-200/60 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800/60 dark:hover:text-neutral-300"
              title="新对话"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
            {/* MCP Tool Button */}
            {currentMcpInfo && (
              <div className="relative group/mcp w-80">
                <button
                  className="flex items-center justify-center rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-200/60 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800/60 dark:hover:text-neutral-300"
                  title="当前连接的MCP工具"
                >
                  <McpIcon className="h-4 w-4" />
                  {currentMcpInfo.servers.length > 0 && (
                    <span className="ml-1 rounded-full bg-indigo-100 px-1.5 py-0.5 text-xs font-medium text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
                      {currentMcpInfo.servers.reduce(
                        (total, server) => total + (server.tools?.length || 0),
                        0,
                      )}
                    </span>
                  )}
                </button>

                {/* MCP Tooltip */}

                <div
                  className=" transition-opacity max-w-full overflow-auto opacity-0 group-hover/mcp:opacity-100 absolute bottom-full left-0 mb-2 w-fit rounded-lg border
                 border-neutral-200 bg-white p-3 shadow-lg
                  dark:border-neutral-700 dark:bg-neutral-800 z-50"
                >
                  <div className="mb-2">
                    <div className="flex items-center space-x-2">
                      <McpIcon className="h-4 w-4 text-indigo-500" />
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        MCP 工具连接
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                      助手: {currentMcpInfo.agent.name}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {currentMcpInfo.servers.map((server) => (
                      <div
                        key={server.id}
                        className="rounded-md bg-neutral-50 p-2 dark:bg-neutral-700/50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div
                              className={`h-2 w-2 rounded-full ${
                                server.status === "online"
                                  ? "bg-green-500"
                                  : "bg-red-500"
                              }`}
                            />
                            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                              {server.name}
                            </span>
                          </div>
                          <span className="text-xs text-neutral-500 dark:text-neutral-400">
                            {server.tools?.length || 0} 工具
                          </span>
                        </div>

                        {server.tools && server.tools.length > 0 && (
                          <div className="mt-2">
                            <div className="flex flex-wrap gap-1">
                              {server.tools.slice(0, 5).map((tool, index) => (
                                <span
                                  key={index}
                                  className="inline-block rounded bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                                >
                                  {tool.name}
                                </span>
                              ))}
                              {server.tools.length > 5 && (
                                <span className="inline-block rounded bg-neutral-200 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-600 dark:text-neutral-300">
                                  +{server.tools.length - 5}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Arrow */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white dark:border-t-neutral-800"></div>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={onShowHistory}
            className="flex items-center justify-center rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-200/60 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800/60 dark:hover:text-neutral-300"
            title="历史记录"
          >
            <ClockIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </DndContext>
  );
}
