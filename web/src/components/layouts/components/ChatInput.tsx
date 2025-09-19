import { PaperAirplaneIcon } from "@heroicons/react/24/solid";
import React, { useState } from "react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  height?: number; // Accept height from parent instead of managing internally
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = "输入消息...",
  height = 80, // Default height if not provided
}) => {
  const [inputMessage, setInputMessage] = useState("");
  // 添加一个状态来跟踪输入法的组合状态
  const [isComposing, setIsComposing] = useState(false);

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
    <div className="w-full bg-neutral-50/80 dark:bg-neutral-950/80">
      <div className="group relative">
        <textarea
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder={placeholder}
          className="w-full resize-none bg-transparent py-2 pl-3 pr-12 text-sm placeholder-neutral-500 focus:outline-none dark:text-white dark:placeholder-neutral-400"
          style={{
            height: `${height}px`,
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
      <p className="pb-2 ml-2 text-xs text-neutral-500 dark:text-neutral-400">
        按 Enter 发送，Shift+Enter 换行
      </p>
    </div>
  );
};

export default ChatInput;
