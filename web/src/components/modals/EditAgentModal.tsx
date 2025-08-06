import React, { useEffect, useState } from "react";

import type { Agent } from "@/components/layouts/XyzenAgent";
import { useXyzen } from "@/store/xyzenStore";

interface EditAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: Agent | null;
}

const EditAgentModal: React.FC<EditAgentModalProps> = ({
  isOpen,
  onClose,
  agent: agentToEdit,
}) => {
  const { updateAgent, mcpServers, fetchMcpServers } = useXyzen();
  const [agent, setAgent] = useState<Agent | null>(agentToEdit);

  useEffect(() => {
    setAgent(agentToEdit);
    if (isOpen) {
      fetchMcpServers();
    }
  }, [agentToEdit, isOpen, fetchMcpServers]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    if (!agent) return;
    const { name, value } = e.target;
    setAgent({ ...agent, [name]: value });
  };

  const handleTagChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!agent) return;
    const { value } = e.target;
    setAgent({ ...agent, tags: value.split(",") });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agent) return;
    await updateAgent(agent);
    onClose();
  };

  const handleMcpServerChange = (serverId: number) => {
    if (!agent) return;
    const currentIds = agent.mcp_server_ids || [];
    const newIds = currentIds.includes(serverId)
      ? currentIds.filter((id) => id !== serverId)
      : [...currentIds, serverId];
    setAgent({ ...agent, mcp_server_ids: newIds });
  };

  if (!isOpen || !agent) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-neutral-900/90 dark:border dark:border-neutral-700/50 dark:backdrop-blur">
        <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
          编辑助手
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <input
            type="text"
            name="name"
            placeholder="助手名称"
            value={agent.name}
            onChange={handleChange}
            required
            className="w-full rounded-md border p-2 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
          />
          <textarea
            name="description"
            placeholder="描述"
            value={agent.description}
            onChange={handleChange}
            className="w-full rounded-md border p-2 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
          />
          <textarea
            name="prompt"
            placeholder="Prompt"
            value={agent.prompt}
            onChange={handleChange}
            className="w-full rounded-md border p-2 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
          />
          <input
            type="text"
            name="avatar"
            placeholder="头像 URL"
            value={agent.avatar}
            onChange={handleChange}
            className="w-full rounded-md border p-2 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
          />
          <input
            type="text"
            name="tags"
            placeholder="标签 (逗号分隔)"
            value={agent.tags.join(",")}
            onChange={handleTagChange}
            className="w-full rounded-md border p-2 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
          />
          <input
            type="text"
            name="model"
            placeholder="模型"
            value={agent.model}
            onChange={handleChange}
            className="w-full rounded-md border p-2 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
          />
          <input
            type="number"
            name="temperature"
            placeholder="Temperature"
            value={agent.temperature}
            onChange={handleChange}
            className="w-full rounded-md border p-2 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
          />
          <div>
            <h3 className="mb-2 text-sm font-medium text-neutral-800 dark:text-neutral-100">
              绑定 MCP Servers
            </h3>
            <div className="max-h-32 overflow-y-auto rounded-md border p-2 dark:border-neutral-700">
              {mcpServers.map((server) => (
                <div key={server.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`mcp-${server.id}`}
                    checked={agent.mcp_server_ids?.includes(server.id) || false}
                    onChange={() => handleMcpServerChange(server.id)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label
                    htmlFor={`mcp-${server.id}`}
                    className="ml-2 text-sm text-neutral-700 dark:text-neutral-300"
                  >
                    {server.name}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              取消
            </button>
            <button
              type="submit"
              className="rounded-md bg-indigo-500 px-4 py-2 text-sm text-white hover:bg-indigo-600"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditAgentModal;
