import { AnimatePresence, motion } from "framer-motion";
import { ChevronDownIcon, CheckIcon } from "@heroicons/react/24/solid";
import { useState, useEffect } from "react";
import type { ExecutionStatus } from "@/types/agentEvents";
import Markdown from "@/lib/Markdown";
import LoadingMessage from "./LoadingMessage";

interface AgentNodeItemProps {
  nodeName: string;
  status: ExecutionStatus;
  content?: string;
  isActive?: boolean;
  className?: string;
}

/**
 * AgentNodeItem displays a single node/phase in a compact accordion style.
 * Features checkbox-style status indicators matching the new design spec.
 */
export default function AgentNodeItem({
  nodeName,
  status,
  content,
  isActive = false,
  className = "",
}: AgentNodeItemProps) {
  const [isExpanded, setIsExpanded] = useState(isActive);

  // Auto-expand when node becomes active, auto-collapse when completed
  useEffect(() => {
    if (isActive) {
      setIsExpanded(true);
    } else if (status === "completed" || status === "failed") {
      setIsExpanded(false);
    }
  }, [isActive, status]);

  const hasContent = Boolean(content && content.trim().length > 0);
  const canExpand = hasContent && status !== "pending";

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`relative ${className}`}
    >
      {/* Header */}
      <button
        onClick={() => canExpand && setIsExpanded(!isExpanded)}
        disabled={!canExpand}
        className={`flex w-full items-center gap-3 rounded-[6px] px-3 py-2 text-left transition-colors ${
          canExpand
            ? "cursor-pointer hover:bg-neutral-100/80 dark:hover:bg-neutral-700/30"
            : "cursor-default"
        } ${isActive ? "bg-neutral-100/50 dark:bg-neutral-700/20" : ""}`}
      >
        {/* Status Indicator */}
        <StatusIndicator status={status} />

        {/* Node Name */}
        <span className="flex-1 text-sm font-medium text-neutral-700 dark:text-neutral-300 truncate">
          {nodeName}
        </span>

        {/* Right side indicator */}
        <RightIndicator
          status={status}
          hasContent={hasContent}
          isExpanded={isExpanded}
          canExpand={canExpand}
        />
      </button>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && hasContent && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pl-9 pr-3 pb-2">
              <div className="prose prose-sm dark:prose-invert max-w-none text-neutral-600 dark:text-neutral-400 max-h-64 overflow-y-auto">
                <Markdown content={content ?? ""} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * Checkbox-style status indicator
 */
function StatusIndicator({ status }: { status: ExecutionStatus }) {
  switch (status) {
    case "completed":
      return (
        <motion.div
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-green-500 dark:bg-green-600"
        >
          <CheckIcon className="h-3 w-3 text-white" />
        </motion.div>
      );

    case "running":
      return (
        <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-blue-500 dark:border-blue-400 bg-white dark:bg-neutral-900">
          <LoadingMessage size="small" />
        </div>
      );

    case "failed":
      return (
        <motion.div
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-red-500 dark:bg-red-600"
        >
          <span className="text-white text-xs font-bold">!</span>
        </motion.div>
      );

    case "skipped":
      return (
        <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-yellow-400 dark:bg-yellow-500">
          <span className="text-white text-xs">-</span>
        </div>
      );

    case "pending":
    default:
      return (
        <div className="h-[22px] w-[22px] rounded-full border-2 border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900" />
      );
  }
}

/**
 * Right side indicator (status text or chevron)
 */
function RightIndicator({
  status,
  hasContent,
  isExpanded,
  canExpand,
}: {
  status: ExecutionStatus;
  hasContent: boolean;
  isExpanded: boolean;
  canExpand: boolean;
}) {
  if (status === "pending") {
    return (
      <span className="text-xs text-neutral-400 dark:text-neutral-500">
        pending
      </span>
    );
  }

  if (status === "running" && !hasContent) {
    return (
      <span className="text-xs text-blue-500 dark:text-blue-400">
        running...
      </span>
    );
  }

  if (!canExpand) {
    return null;
  }

  return (
    <motion.div
      animate={{ rotate: isExpanded ? 180 : 0 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
    >
      <ChevronDownIcon className="h-4 w-4 text-neutral-400" />
    </motion.div>
  );
}
