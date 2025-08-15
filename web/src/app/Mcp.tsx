import { LoadingSpinner } from "@/components/base/LoadingSpinner";
import { websocketService } from "@/service/websocketService";
import { useXyzen } from "@/store/xyzenStore";
import type { McpServer } from "@/types/mcp";
import { Button } from "@headlessui/react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useEffect } from "react";

interface ServerStatusIndicatorProps {
  status: "online" | "offline" | string;
}

const ServerStatusIndicator: React.FC<ServerStatusIndicatorProps> = ({
  status,
}) => {
  const isOnline = status === "online";
  return (
    <div className="flex items-center">
      <span
        className={`h-2.5 w-2.5 rounded-full ${
          isOnline ? "bg-green-500" : "bg-red-500"
        }`}
      />
      <span
        className={`ml-2 text-xs font-medium ${
          isOnline
            ? "text-green-700 dark:text-green-300"
            : "text-red-700 dark:text-red-300"
        }`}
      >
        {isOnline ? "Online" : "Offline"}
      </span>
    </div>
  );
};

interface McpServerCardProps {
  server: McpServer;
  onRemove: (id: number) => void;
}

const McpServerCard: React.FC<McpServerCardProps> = ({ server, onRemove }) => {
  const toolCount = server.tools?.length || 0;

  return (
    <div className="group relative flex items-center justify-between rounded-lg border border-neutral-200 p-3 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900">
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center">
          <ServerStatusIndicator status={server.status} />
          <h3 className="ml-3 truncate text-sm font-medium text-neutral-800 dark:text-white">
            {server.name}
          </h3>
        </div>
        <p className="mt-1 truncate text-xs text-neutral-500">
          {server.description}
        </p>
        <div className="mt-2 flex items-center text-xs text-neutral-500">
          <span className="truncate">{server.url}</span>
          <span className="mx-1.5">·</span>
          <span className="whitespace-nowrap">{toolCount} Tools</span>
        </div>
      </div>
      <div className="ml-4 flex items-center">
        <button
          onClick={() => onRemove(server.id)}
          className="invisible rounded p-1 text-neutral-400 hover:bg-red-100 hover:text-red-600 group-hover:visible dark:hover:bg-neutral-800 dark:hover:text-red-500"
          title="Remove Server"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export function Mcp() {
  const {
    mcpServers,
    mcpServersLoading,
    fetchMcpServers,
    removeMcpServer,
    updateMcpServerInList,
    backendUrl,
    openAddMcpServerModal,
  } = useXyzen();

  useEffect(() => {
    if (backendUrl) {
      fetchMcpServers();

      // Connect to WebSocket for real-time updates
      websocketService.connect("/ws/v1/mcp", (serverUpdate) => {
        updateMcpServerInList(serverUpdate);
      });

      // Disconnect on component unmount
      return () => {
        websocketService.disconnect();
      };
    }
  }, [backendUrl, fetchMcpServers, updateMcpServerInList]);

  return (
    <div className="p-4 dark:text-neutral-200">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">MCP Servers</h2>
        <Button
          onClick={openAddMcpServerModal}
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 py-1.5 px-3 text-sm/6 font-semibold text-white shadow-inner shadow-white/10 focus:outline-none data-[hover]:bg-indigo-500 data-[open]:bg-indigo-700 data-[focus]:outline-1 data-[focus]:outline-white dark:bg-indigo-500 dark:data-[hover]:bg-indigo-400"
        >
          <PlusIcon className="h-4 w-4" />
          Add Server
        </Button>
      </div>

      {mcpServersLoading ? (
        <LoadingSpinner />
      ) : mcpServers.length > 0 ? (
        <div className="space-y-2">
          {mcpServers.map((server) => (
            <McpServerCard
              key={server.id}
              server={server}
              onRemove={removeMcpServer}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 p-12 text-center dark:border-neutral-700">
          <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
            No MCP Servers Found
          </h3>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Get started by adding your first MCP server to connect tools.
          </p>
          <Button
            onClick={openAddMcpServerModal}
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-indigo-600 py-2 px-4 text-sm font-semibold text-white shadow-inner shadow-white/10 focus:outline-none data-[hover]:bg-indigo-500 data-[open]:bg-indigo-700 data-[focus]:outline-1 data-[focus]:outline-white dark:bg-indigo-500 dark:data-[hover]:bg-indigo-400"
          >
            <PlusIcon className="h-5 w-5" />
            Add Your First Server
          </Button>
        </div>
      )}
    </div>
  );
}
