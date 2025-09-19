import { Input } from "@/components/base/Input";
import { Modal } from "@/components/base/Modal";
import { useXyzen } from "@/store";
import type { McpServerCreate } from "@/types/mcp";
import { Button, Field, Label } from "@headlessui/react";
import { useState, type ChangeEvent } from "react";

export function AddMcpServerModal() {
  const { isAddMcpServerModalOpen, closeAddMcpServerModal, addMcpServer } =
    useXyzen();
  const [newServer, setNewServer] = useState<McpServerCreate>({
    name: "",
    description: "",
    url: "",
    token: "",
  });
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewServer((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddServer = async () => {
    setError(null);
    if (!newServer.name || !newServer.url) {
      setError("Name and URL are required.");
      return;
    }
    try {
      await addMcpServer(newServer);
      setNewServer({ name: "", description: "", url: "", token: "" });
      // The modal is closed from the store action on success
    } catch (err) {
      setError("Failed to add server. Please check the details and try again.");
      console.error(err);
    }
  };

  const handleClose = () => {
    setNewServer({ name: "", description: "", url: "", token: "" });
    setError(null);
    closeAddMcpServerModal();
  };

  return (
    <Modal
      isOpen={isAddMcpServerModalOpen}
      onClose={handleClose}
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
            required
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
            required
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
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-500">{error}</p>
      )}
      <div className="mt-6 flex justify-end gap-4">
        <Button
          onClick={handleClose}
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
  );
}
