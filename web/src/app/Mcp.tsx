import { Input } from "@/components/base/Input";
import { LoadingSpinner } from "@/components/base/LoadingSpinner";
import { Modal } from "@/components/base/Modal";
import { websocketService } from "@/service/websocketService";
import { useXyzen } from "@/store/xyzenStore";
import type { McpServer, McpServerCreate } from "@/types/mcp";
import { Button, Field, Label } from "@headlessui/react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useEffect, useState, type ChangeEvent } from "react";

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
    addMcpServer,
    removeMcpServer,
    updateMcpServerInList,
    backendUrl,
  } = useXyzen();
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [newServer, setNewServer] = useState<McpServerCreate>({
    name: "",
    description: "",
    url: "",
    token: "",
  });

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

  const handleAddServer = async () => {
    await addMcpServer(newServer);
    setNewServer({ name: "", description: "", url: "", token: "" });
    setAddDialogOpen(false);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewServer((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="p-4 dark:text-neutral-200">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">MCP Servers</h2>
        <Button
          onClick={() => setAddDialogOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 py-1.5 px-3 text-sm/6 font-semibold text-white shadow-inner shadow-white/10 focus:outline-none data-[hover]:bg-indigo-500 data-[open]:bg-indigo-700 data-[focus]:outline-1 data-[focus]:outline-white dark:bg-indigo-500 dark:data-[hover]:bg-indigo-400"
        >
          <PlusIcon className="h-4 w-4" />
          Add Server
        </Button>
      </div>

      <Modal
        isOpen={isAddDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        title="Add New MCP Server"
      >
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Enter the details for the new MCP server.
        </p>
        <div className="mt-4 space-y-4">
          <Field>
            <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Name
            </Label>
            <Input
              name="name"
              value={newServer.name}
              onChange={handleInputChange}
              placeholder="My Local Server"
            />
          </Field>
          <Field>
            <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Description
            </Label>
            <Input
              name="description"
              value={newServer.description}
              onChange={handleInputChange}
              placeholder="A brief description of the server"
            />
          </Field>
          <Field>
            <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              URL
            </Label>
            <Input
              name="url"
              value={newServer.url}
              onChange={handleInputChange}
              placeholder="http://localhost:8000"
            />
          </Field>
          <Field>
            <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Token (Optional)
            </Label>
            <Input
              name="token"
              value={newServer.token}
              onChange={handleInputChange}
              placeholder="Enter token if required"
            />
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-4">
          <Button
            onClick={() => setAddDialogOpen(false)}
            className="inline-flex items-center gap-2 rounded-md bg-neutral-100 py-1.5 px-3 text-sm/6 font-semibold text-neutral-700 shadow-sm focus:outline-none data-[hover]:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:data-[hover]:bg-neutral-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddServer}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 py-1.5 px-3 text-sm/6 font-semibold text-white shadow-inner shadow-white/10 focus:outline-none data-[hover]:bg-indigo-500 data-[open]:bg-indigo-700 data-[focus]:outline-1 data-[focus]:outline-white dark:bg-indigo-500 dark:data-[hover]:bg-indigo-400"
          >
            Save
          </Button>
        </div>
      </Modal>

      {mcpServersLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-2">
          {mcpServers.map((server) => (
            <McpServerCard
              key={server.id}
              server={server}
              onRemove={removeMcpServer}
            />
          ))}
        </div>
      )}
    </div>
  );
}
