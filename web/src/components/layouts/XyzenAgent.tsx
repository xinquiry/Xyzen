"use client";
import { motion, type Variants } from "framer-motion";
import React, { useEffect, useState } from "react";

import AddAgentModal from "@/components/modals/AddAgentModal";
import EditAgentModal from "@/components/modals/EditAgentModal";
import { useXyzen } from "@/store/xyzenStore";

export type Agent = {
  id: string;
  name: string;
  description: string;
  prompt: string;
  mcp_servers: { id: number }[];
  mcp_server_ids?: number[];
  user_id: string;
};

interface AgentCardProps {
  agent: Agent;
  onClick?: (agent: Agent) => void;
  onEdit?: (agent: Agent) => void;
}

// 定义动画变体
const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 12,
    },
  },
};

// 详细版本-包括名字，描述，头像，标签以及GPT模型
const AgentCard: React.FC<AgentCardProps> = ({ agent, onClick, onEdit }) => {
  return (
    <motion.div
      layout
      variants={itemVariants}
      whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick?.(agent)}
      className={`
        group relative flex cursor-pointer items-start gap-4 rounded-lg border p-3
        border-neutral-200 bg-white hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800/60
      `}
    >
      {/* 头像 */}
      <img
        src="https://cdn1.deepmd.net/static/img/affb038eChatGPT Image 2025年8月6日 10_33_07.png"
        alt={agent.name}
        className="h-10 w-10 rounded-full object-cover border border-neutral-200 dark:border-neutral-700"
      />

      {/* 内容 */}
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-white">
            {agent.name}
          </h3>
          <div className="flex items-center space-x-2">
            {agent.mcp_servers && agent.mcp_servers.length > 0 && (
              <span className="text-xs text-gray-500">
                {agent.mcp_servers.length} MCPs
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(agent);
              }}
              className="z-10 text-xs text-neutral-500 hover:text-indigo-600 dark:text-neutral-400 dark:hover:text-indigo-400"
            >
              编辑
            </button>
          </div>
        </div>

        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">
          {agent.description}
        </p>
      </div>
    </motion.div>
  );
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export default function XyzenAgent() {
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const { agents, fetchAgents, createDefaultChannel } = useXyzen();

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleAgentClick = (agent: Agent) => {
    createDefaultChannel(agent.id);
  };

  const handleEditClick = (agent: Agent) => {
    setEditingAgent(agent);
    setEditModalOpen(true);
  };

  return (
    <motion.div
      className="space-y-2 px-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {agents.map((agent) => (
        <AgentCard
          key={agent.id}
          agent={agent}
          onClick={handleAgentClick}
          onEdit={handleEditClick}
        />
      ))}
      <button
        className="w-full rounded-lg border-2 border-dashed border-neutral-300 bg-transparent py-3 text-sm font-semibold text-neutral-600 transition-colors hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:bg-neutral-800/50"
        onClick={() => setAddModalOpen(true)}
      >
        + 添加助手
      </button>
      <AddAgentModal
        isOpen={isAddModalOpen}
        onClose={() => setAddModalOpen(false)}
      />
      <EditAgentModal
        isOpen={isEditModalOpen}
        onClose={() => setEditModalOpen(false)}
        agent={editingAgent}
      />
    </motion.div>
  );
}
