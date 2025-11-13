import { useXyzen } from "@/store";
import { ChevronUpIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import React, { useEffect, useRef } from "react";

export function CenteredInput() {
  const {
    isXyzenOpen,
    pendingInput,
    setPendingInput,
    submitInput,
    sendMessage,
    activeChatChannel,
    createDefaultChannel,
    openXyzen,
    setTabIndex,
  } = useXyzen();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isMounted, setIsMounted] = React.useState(false);
  const showInput = !isXyzenOpen; // Show input when sidebar is closed

  useEffect(() => {
    // Trigger slide-up animation on mount
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (showInput && inputRef.current) {
      // Auto-focus after a short delay to ensure the input is rendered
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showInput]);

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && pendingInput.trim()) {
      e.preventDefault();
      const messageToSend = pendingInput.trim();

      // First expand to sidebar
      submitInput();

      // Ensure we have a chat channel
      try {
        if (!activeChatChannel) {
          await createDefaultChannel("default-chat");
        }

        // Send the message after sidebar opens and channel is ready
        setTimeout(() => {
          sendMessage(messageToSend);
          setPendingInput(""); // Clear input after sending
        }, 200);
      } catch (error) {
        console.error("Failed to create channel or send message:", error);
        setPendingInput(""); // Clear input even if there's an error
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setPendingInput("");
      inputRef.current?.blur();
    }
  };

  const handleFocus = () => {
    // Auto-focus behavior when clicking on input
  };

  const handleOpenSidebar = () => {
    // Open sidebar without sending message
    openXyzen();
    setTabIndex(1); // Switch to Chat tab
  };

  if (!showInput) {
    return null;
  }

  return (
    <div
      className={clsx(
        "fixed bottom-6 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 px-4",
        "transition-all duration-700 ease-out",
        isMounted ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0",
      )}
    >
      <div className="flex items-center gap-2">
        <div className="relative flex-1 group">
          <input
            ref={inputRef}
            type="text"
            value={pendingInput}
            onChange={(e) => setPendingInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            placeholder="Type your message..."
            className={clsx(
              "w-full appearance-none focus:outline-none rounded-full border border-neutral-200/50 bg-white/60 backdrop-blur-md py-2.5 px-5 pr-10 text-sm text-neutral-950 placeholder:text-neutral-500",
              "shadow-lg transition-all duration-300 ease-out origin-right",
              "focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-300 focus:bg-white/80 focus:shadow-xl focus:scale-x-110 focus:scale-y-105 focus:backdrop-blur-lg",
              "hover:scale-[1.01] hover:shadow-xl hover:bg-white/70 hover:backdrop-blur-lg",
              "dark:border-neutral-700/50 dark:bg-neutral-900/60 dark:text-white dark:placeholder:text-neutral-400",
              "dark:focus:ring-indigo-500/50 dark:focus:border-indigo-600 dark:focus:bg-neutral-900/80",
              "dark:hover:bg-neutral-900/70",
            )}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 dark:text-neutral-500 pointer-events-none transition-opacity duration-300 focus-within:opacity-0">
            ↵
          </div>
        </div>

        <button
          onClick={handleOpenSidebar}
          className={clsx(
            "flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200/50 bg-white/60 backdrop-blur-md text-neutral-600",
            "shadow-lg transition-all duration-300 ease-out",
            "hover:bg-white/80 hover:text-indigo-600 hover:border-indigo-200/50 hover:shadow-xl hover:scale-110 hover:backdrop-blur-lg",
            "focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-300",
            "active:scale-95",
            "dark:border-neutral-700/50 dark:bg-neutral-900/60 dark:text-neutral-400",
            "dark:hover:bg-neutral-900/80 dark:hover:text-indigo-400 dark:hover:border-indigo-700/50",
          )}
          title="Open sidebar"
        >
          <ChevronUpIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
