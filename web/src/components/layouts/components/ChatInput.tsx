import {
  type DragEndEvent,
  type DragMoveEvent,
  DndContext,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { PaperAirplaneIcon } from "@heroicons/react/24/solid";
import React, { useEffect, useRef, useState } from "react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  onHeightChange?: (height: number) => void; // New prop to report height changes
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
      className="absolute -top-2 left-0 right-0 -mx-2 h-0.5 cursor-ns-resize transition-colors hover:bg-indigo-600"
      title="拖动调整高度"
    />
  );
};

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = "输入消息...",
  onHeightChange,
}) => {
  const [inputMessage, setInputMessage] = useState("");
  const [textareaHeight, setTextareaHeight] = useState(() => {
    // Try to get saved height from localStorage
    const savedHeight = localStorage.getItem("chatInputHeight");
    return savedHeight ? parseInt(savedHeight, 10) : 80; // Default 80px
  });
  // 添加一个状态来跟踪输入法的组合状态
  const [isComposing, setIsComposing] = useState(false);

  // Use a ref to hold the latest onHeightChange callback
  // This avoids making the useEffect dependent on the function's identity
  const onHeightChangeRef = useRef(onHeightChange);
  onHeightChangeRef.current = onHeightChange;

  // Keep track of initial height when drag starts
  const initialHeightRef = useRef(textareaHeight);
  // Keep track of total delta during drag
  const dragDeltaRef = useRef(0);

  // Setup dnd sensors with lower activation distance for more responsiveness
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 0, // Decreased from 1 to improve responsiveness
      },
    }),
  );

  // Save height to localStorage when it changes and report height changes to parent
  useEffect(() => {
    localStorage.setItem("chatInputHeight", textareaHeight.toString());
    if (onHeightChangeRef.current) {
      onHeightChangeRef.current(textareaHeight);
    }
  }, [textareaHeight]);

  // Handle drag start to set initial height reference
  const handleDragStart = () => {
    initialHeightRef.current = textareaHeight;
    dragDeltaRef.current = 0;
  };

  // Handle drag move to update height in real-time
  const handleDragMove = (event: DragMoveEvent) => {
    const { delta } = event;
    dragDeltaRef.current = delta.y;

    // Calculate new height based on initial height and total delta
    const newHeight = Math.max(60, initialHeightRef.current - delta.y);
    setTextareaHeight(newHeight);
  };

  // Handle drag end for final cleanup
  const handleDragEnd = (_: DragEndEvent) => {
    // Final height adjustment already done during move, just ensure it's saved
    const finalHeight = Math.max(
      60,
      initialHeightRef.current - dragDeltaRef.current,
    );
    setTextareaHeight(finalHeight);

    // Reset the refs
    dragDeltaRef.current = 0;
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    onSendMessage(inputMessage);
    setInputMessage("");
  };

  // 处理输入法组合开始事件
  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  // 处理输入法组合结束事件
  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  // Handle Enter key to send message
  const handleKeyPress = (e: React.KeyboardEvent) => {
    // 如果是在输入法组合状态中，不处理回车键事件
    if (e.key === "Enter" && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="w-full">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      >
        <div className="group relative">
          {/* Drag handle - only visible on hover */}
          <ResizeHandle />

          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            placeholder={placeholder}
            className="w-full resize-none  bg-white py-2 pl-3 pr-12 text-sm placeholder-neutral-500 focus:outline-none  dark:bg-black dark:text-white dark:placeholder-neutral-400"
            style={{
              height: `${textareaHeight}px`,
              transition: "none", // Remove transition to make height follow mouse exactly
            }}
            disabled={disabled}
          />
          <button
            onClick={handleSendMessage}
            disabled={disabled || !inputMessage.trim()}
            className="absolute bottom-4 right-2 rounded-md
             bg-indigo-600 p-1.5 text-white transition-colors
              hover:bg-indigo-700 disabled:bg-neutral-300 disabled:text-neutral-500 dark:disabled:bg-neutral-700 dark:disabled:text-neutral-400"
            aria-label="Send message"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
          </button>
        </div>
      </DndContext>
      <p className="mt-0.5 ml-2 text-xs text-neutral-500">
        按 Enter 发送，Shift+Enter 换行
      </p>
    </div>
  );
};

export default ChatInput;
