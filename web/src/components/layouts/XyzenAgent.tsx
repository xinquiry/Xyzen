"use client";
import { motion, type Variants } from "framer-motion";
import React, { useState } from "react";

const agents = [
  {
    id: "agent-1",
    name: "编程助手",
    description: "精通 JavaScript、Python 和算法题的编程专家。",
    avatar: "https://example.com/avatar/coding.png",
    tags: ["编程", "技术", "算法"],
    model: "GPT-4",
    temperature: 0.2,
  },
  {
    id: "agent-2",
    name: "文案创作助手",
    description: "擅长写作、广告文案和内容创意，适合市场营销场景。",
    avatar: "https://example.com/avatar/copywriter.png",
    tags: ["写作", "创意", "营销"],
    model: "GPT-4o",
    temperature: 0.7,
  },
  {
    id: "agent-3",
    name: "英语翻译官",
    description: "中英互译精准流畅，适合日常、专业、法律类文本翻译。",
    avatar: "https://example.com/avatar/translator.png",
    tags: ["翻译", "语言", "英文"],
    model: "GPT-3.5",
    temperature: 0.3,
  },
  {
    id: "agent-4",
    name: "心理陪伴者",
    description: "温柔体贴，擅长倾听与情绪疏导，不提供医疗建议。",
    avatar: "https://example.com/avatar/therapy.png",
    tags: ["情绪", "陪伴", "温暖"],
    model: "GPT-4",
    temperature: 0.9,
  },
  {
    id: "agent-5",
    name: "产品经理助手",
    description: "擅长撰写PRD、制作需求文档、头脑风暴产品创意。",
    avatar: "https://example.com/avatar/pm.png",
    tags: ["产品", "分析", "文档"],
    model: "GPT-4",
    temperature: 0.5,
  },
];

export type Agent = {
  id: string;
  name: string;
  description: string;
  avatar: string;
  tags: string[];
  model: string;
  temperature: number;
};

interface AgentCardProps {
  agent: Agent;
  onClick?: (agent: Agent) => void;
  selected?: boolean;
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
const AgentCard: React.FC<AgentCardProps> = ({ agent, selected, onClick }) => {
  return (
    <motion.div
      layout
      variants={itemVariants}
      whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick?.(agent)}
      className={`
        group relative flex cursor-pointer items-start gap-4 rounded-lg border p-3
        ${
          selected
            ? "border-indigo-500/50 bg-indigo-50 dark:border-indigo-400/30 dark:bg-neutral-800/50"
            : "border-neutral-200 bg-white hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800/60"
        }
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
          <span className="text-xs text-indigo-600 dark:text-indigo-400">
            {agent.model}
          </span>
        </div>

        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">
          {agent.description}
        </p>

        <div className="mt-2 flex flex-wrap gap-1">
          {agent.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
            >
              {tag}
            </span>
          ))}
        </div>
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
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  // const agents = useXyzen((state) => state.agents);
  // const { createDefaultChannel } = useXyzen();
  const handleAgentClick = (agent: Agent) => {
    // createDefaultChannel(agent); // 👈 传入 agent
    setSelectedAgentId(agent.id);
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
          selected={agent.id === selectedAgentId}
          onClick={handleAgentClick}
        />
      ))}
    </motion.div>
  );
}
