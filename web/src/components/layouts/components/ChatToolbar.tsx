"use client";

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
import { useRef, useState } from "react";

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
  const { createDefaultChannel } = useXyzen();

  // State for managing input height
  const [inputHeight, setInputHeight] = useState(() => {
    const savedHeight = localStorage.getItem("chatInputHeight");
    return savedHeight ? parseInt(savedHeight, 10) : 80;
  });

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
          <button
            onClick={handleNewChat}
            className="flex items-center justify-center rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-200/60 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800/60 dark:hover:text-neutral-300"
            title="新对话"
          >
            <PlusIcon className="h-4 w-4" />
          </button>

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
