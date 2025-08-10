import { Switch } from "@/components/base/Switch";
import type { McpServer } from "@/types/mcp";
import clsx from "clsx";
import React from "react";

interface McpServerItemProps {
  mcp: McpServer;
  isSelected: boolean;
  onSelectionChange: (selected: boolean) => void;
}

export const McpServerItem: React.FC<McpServerItemProps> = ({
  mcp,
  isSelected,
  onSelectionChange,
}) => {
  const isOffline = mcp.status !== "online";

  return (
    <div
      className={clsx(
        "flex items-center justify-between rounded-lg p-3 transition-colors",
        {
          "hover:bg-neutral-100 dark:hover:bg-neutral-800": !isOffline,
          "opacity-60": isOffline,
        },
      )}
      title={
        isOffline ? "This MCP server is offline and cannot be selected" : ""
      }
    >
      <div className="flex-grow">
        <div className="flex items-center space-x-2">
          <div
            className={clsx("h-2.5 w-2.5 flex-shrink-0 rounded-full", {
              "bg-green-500": !isOffline,
              "bg-neutral-500": isOffline,
            })}
          />
          <p className="font-medium text-neutral-900 dark:text-neutral-100">
            {mcp.name}
          </p>
          {mcp.tools && mcp.tools.length > 0 && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {mcp.tools.length} Tools
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400 line-clamp-1">
          {mcp.description || "No description available"}
        </p>
      </div>
      <div className="ml-4">
        <Switch
          checked={isSelected}
          onChange={onSelectionChange}
          disabled={isOffline}
        />
      </div>
    </div>
  );
};
