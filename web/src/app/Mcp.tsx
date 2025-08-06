import { Input } from "@/components/base";
import { useXyzen } from "@/store/xyzenStore";
import type { McpServerCreate } from "@/types/mcp";
import {
  Button,
  Dialog,
  DialogPanel,
  DialogTitle,
  Field,
  Label,
} from "@headlessui/react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useEffect, useState, type ChangeEvent } from "react";

export function Mcp() {
  const {
    mcpServers,
    mcpServersLoading,
    fetchMcpServers,
    addMcpServer,
    removeMcpServer,
  } = useXyzen();
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [newServer, setNewServer] = useState<McpServerCreate>({
    name: "",
    description: "",
    url: "",
    token: "",
  });

  useEffect(() => {
    fetchMcpServers();
  }, [fetchMcpServers]);

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
        <Dialog
          open={isAddDialogOpen}
          onClose={() => setAddDialogOpen(false)}
          className="relative z-50"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
            <DialogPanel className="max-w-lg space-y-4 rounded-lg border border-neutral-200/50 bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900">
              <DialogTitle className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                Add New MCP Server
              </DialogTitle>
              <p className="text-neutral-600 dark:text-neutral-400">
                Enter the details for the new MCP server.
              </p>
              <Field>
                <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Name
                </Label>
                <Input
                  name="name"
                  value={newServer.name}
                  onChange={handleInputChange}
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
                />
              </Field>
              <Field>
                <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Token
                </Label>
                <Input
                  name="token"
                  value={newServer.token}
                  onChange={handleInputChange}
                />
              </Field>
              <div className="flex gap-4 pt-4">
                <Button
                  onClick={handleAddServer}
                  className="inline-flex items-center gap-2 rounded-md bg-indigo-600 py-1.5 px-3 text-sm/6 font-semibold text-white shadow-inner shadow-white/10 focus:outline-none data-[hover]:bg-indigo-500 data-[open]:bg-indigo-700 data-[focus]:outline-1 data-[focus]:outline-white dark:bg-indigo-500 dark:data-[hover]:bg-indigo-400"
                >
                  Save
                </Button>
                <Button
                  onClick={() => setAddDialogOpen(false)}
                  className="inline-flex items-center gap-2 rounded-md bg-neutral-100 py-1.5 px-3 text-sm/6 font-semibold text-neutral-700 shadow-sm focus:outline-none data-[hover]:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:data-[hover]:bg-neutral-700"
                >
                  Cancel
                </Button>
              </div>
            </DialogPanel>
          </div>
        </Dialog>
      </div>

      {mcpServersLoading ? (
        <p>Loading...</p>
      ) : (
        <ul className="space-y-2">
          {mcpServers.map((server) => (
            <li
              key={server.id}
              className="flex items-center justify-between rounded-lg border bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800/50"
            >
              <div>
                <p className="font-semibold text-neutral-800 dark:text-neutral-100">
                  {server.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-neutral-400">
                  {server.description}
                </p>
                <p className="text-sm text-gray-400 dark:text-neutral-500">
                  {server.url}
                </p>
              </div>
              <Button
                onClick={() => removeMcpServer(server.id)}
                className="p-1.5 rounded-md text-neutral-500 hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:bg-neutral-700/60"
              >
                <TrashIcon className="h-4 w-4 text-red-500" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
