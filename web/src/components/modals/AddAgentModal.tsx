import React, { useEffect, useState } from "react";

import type { Agent } from "@/components/layouts/XyzenAgent";
import { useXyzen } from "@/store/xyzenStore";

interface AddAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddAgentModal: React.FC<AddAgentModalProps> = ({ isOpen, onClose }) => {
  const { createAgent, mcpServers, fetchMcpServers } = useXyzen();
  const [agent, setAgent] = useState<
    Omit<Agent, "id" | "user_id" | "mcp_servers" | "mcp_server_ids">
  >({
    name: "",
    description: "",
    prompt: "",
  });
  const [mcpServerIds, setMcpServerIds] = useState<number[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchMcpServers();
    }
  }, [isOpen, fetchMcpServers]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setAgent((prev) => ({ ...prev, [name]: value }));
  };

  const handleMcpServerChange = (serverId: number) => {
    const newIds = mcpServerIds.includes(serverId)
      ? mcpServerIds.filter((id) => id !== serverId)
      : [...mcpServerIds, serverId];
    setMcpServerIds(newIds);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agent.name) {
      alert("助手名称不能为空");
      return;
    }
    try {
      await createAgent({
        ...agent,
        mcp_server_ids: mcpServerIds,
        user_id: "user123",
        mcp_servers: [],
      });
      onClose();
    } catch (error) {
      console.error("Failed to create agent:", error);
      alert("创建助手失败，请查看控制台获取更多信息。");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-neutral-900/90 dark:border dark:border-neutral-700/50 dark:backdrop-blur">
        <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
          添加新助手
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <input
            type="text"
            name="name"
            placeholder="助手名称"
            onChange={handleChange}
            required
            className="w-full rounded-md border p-2 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
          />
          <textarea
            name="description"
            placeholder="描述"
            onChange={handleChange}
            className="w-full rounded-md border p-2 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
          />
          <textarea
            name="prompt"
            placeholder="Prompt"
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
                    id={`add-mcp-${server.id}`}
                    checked={mcpServerIds.includes(server.id)}
                    onChange={() => handleMcpServerChange(server.id)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label
                    htmlFor={`add-mcp-${server.id}`}
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
              创建
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAgentModal;
