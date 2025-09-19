import { llmProviderService } from "@/service/llmProviderService";
import type {
  LlmProviderCreate,
  LlmProviderResponse,
} from "@/types/llmProvider";
import type { StateCreator } from "zustand";
import type { XyzenState } from "../types";

export interface ProviderSlice {
  llmProviders: LlmProviderResponse[];
  llmProvidersLoading: boolean;
  fetchLlmProviders: () => Promise<void>;
  addLlmProvider: (provider: LlmProviderCreate) => Promise<void>;
  editLlmProvider: (
    id: number,
    provider: Partial<LlmProviderCreate>,
  ) => Promise<void>;
  removeLlmProvider: (id: number) => Promise<void>;
  switchActiveProvider: (id: number) => Promise<void>;
}

export const createProviderSlice: StateCreator<
  XyzenState,
  [["zustand/immer", never]],
  [],
  ProviderSlice
> = (set, get) => ({
  llmProviders: [],
  llmProvidersLoading: false,
  fetchLlmProviders: async () => {
    set({ llmProvidersLoading: true });
    try {
      const providers = await llmProviderService.getLlmProviders();
      set({ llmProviders: providers, llmProvidersLoading: false });
    } catch (error) {
      console.error("Failed to fetch LLM providers:", error);
      set({ llmProvidersLoading: false });
    }
  },
  addLlmProvider: async (provider) => {
    try {
      const newProvider = await llmProviderService.createLlmProvider(provider);
      set((state: ProviderSlice) => {
        state.llmProviders.push(newProvider);
      });
      get().closeAddLlmProviderModal();
    } catch (error) {
      console.error("Failed to add LLM provider:", error);
      throw error;
    }
  },
  editLlmProvider: async (id, provider) => {
    try {
      const updatedProvider = await llmProviderService.updateLlmProvider(
        id,
        provider,
      );
      set((state: ProviderSlice) => {
        const index = state.llmProviders.findIndex((p) => p.id === id);
        if (index !== -1) {
          state.llmProviders[index] = updatedProvider;
        }
      });
    } catch (error) {
      console.error("Failed to edit LLM provider:", error);
      throw error;
    }
  },
  removeLlmProvider: async (id) => {
    try {
      await llmProviderService.deleteLlmProvider(id);
      set((state: ProviderSlice) => {
        state.llmProviders = state.llmProviders.filter((p) => p.id !== id);
      });
    } catch (error) {
      console.error("Failed to remove LLM provider:", error);
      throw error;
    }
  },
  switchActiveProvider: async (id) => {
    try {
      await llmProviderService.switchActiveProvider({ provider_id: id });
      await get().fetchLlmProviders();
    } catch (error) {
      console.error("Failed to switch active provider:", error);
      throw error;
    }
  },
});
