import type { Agent } from "@/components/layouts/XyzenAgent";
import type { StateCreator } from "zustand";
import type { XyzenState } from "../types";

export interface AgentSlice {
  agents: Agent[];
  agentsLoading: boolean;
  fetchAgents: () => Promise<void>;
  createAgent: (agent: Omit<Agent, "id">) => Promise<void>;
  updateAgent: (agent: Agent) => Promise<void>;
  deleteAgent: (id: string) => Promise<void>;
}

export const createAgentSlice: StateCreator<
  XyzenState,
  [["zustand/immer", never]],
  [],
  AgentSlice
> = (set, get) => ({
  agents: [],
  agentsLoading: false,
  fetchAgents: async () => {
    set({ agentsLoading: true });
    try {
      const response = await fetch(`${get().backendUrl}/api/v1/agents/`);
      if (!response.ok) {
        throw new Error("Failed to fetch agents");
      }
      const agents: Agent[] = await response.json();
      set({ agents, agentsLoading: false });
    } catch (error) {
      console.error("Failed to fetch agents:", error);
      set({ agentsLoading: false });
      throw error;
    }
  },
  createAgent: async (agent) => {
    try {
      const response = await fetch(`${get().backendUrl}/api/v1/agents/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(agent),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create agent: ${errorText}`);
      }
      await get().fetchAgents();
    } catch (error) {
      console.error(error);
      throw error;
    }
  },
  updateAgent: async (agent) => {
    try {
      const response = await fetch(
        `${get().backendUrl}/api/v1/agents/${agent.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(agent),
        },
      );
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update agent: ${errorText}`);
      }
      await get().fetchAgents();
    } catch (error) {
      console.error(error);
      throw error;
    }
  },
  deleteAgent: async (id) => {
    try {
      const response = await fetch(`${get().backendUrl}/api/v1/agents/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete agent: ${errorText}`);
      }
      await get().fetchAgents();
    } catch (error) {
      console.error(error);
      throw error;
    }
  },
});
