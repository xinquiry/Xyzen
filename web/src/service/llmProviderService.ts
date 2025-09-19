import { useXyzen } from "@/store";
import type {
  LlmProviderCreate,
  LlmProviderResponse,
  SupportedProviderType,
  SwitchProviderRequest,
} from "@/types/llmProvider";

class LlmProviderService {
  private getBackendUrl(): string {
    const { backendUrl } = useXyzen.getState();
    return backendUrl;
  }

  async getLlmProviders(): Promise<LlmProviderResponse[]> {
    const response = await fetch(
      `${this.getBackendUrl()}/api/v1/llm-providers/`,
    );
    if (!response.ok) {
      throw new Error("Failed to fetch LLM providers");
    }
    return response.json();
  }

  async createLlmProvider(
    provider: LlmProviderCreate,
  ): Promise<LlmProviderResponse> {
    const response = await fetch(
      `${this.getBackendUrl()}/api/v1/llm-providers/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(provider),
      },
    );
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create LLM provider: ${error}`);
    }
    return response.json();
  }

  async getLlmProvider(id: number): Promise<LlmProviderResponse> {
    const response = await fetch(
      `${this.getBackendUrl()}/api/v1/llm-providers/${id}`,
    );
    if (!response.ok) {
      throw new Error("Failed to fetch LLM provider");
    }
    return response.json();
  }

  async updateLlmProvider(
    id: number,
    provider: Partial<LlmProviderCreate>,
  ): Promise<LlmProviderResponse> {
    const response = await fetch(
      `${this.getBackendUrl()}/api/v1/llm-providers/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(provider),
      },
    );
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update LLM provider: ${error}`);
    }
    return response.json();
  }

  async deleteLlmProvider(id: number): Promise<void> {
    const response = await fetch(
      `${this.getBackendUrl()}/api/v1/llm-providers/${id}`,
      {
        method: "DELETE",
      },
    );
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete LLM provider: ${error}`);
    }
  }

  async switchActiveProvider(
    request: SwitchProviderRequest,
  ): Promise<{ message: string }> {
    const response = await fetch(
      `${this.getBackendUrl()}/api/v1/llm-providers/switch`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      },
    );
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to switch active provider: ${error}`);
    }
    return response.json();
  }

  async getSupportedTypes(): Promise<SupportedProviderType[]> {
    const response = await fetch(
      `${this.getBackendUrl()}/api/v1/llm-providers/supported-types/`,
    );
    if (!response.ok) {
      throw new Error("Failed to fetch supported provider types");
    }
    return response.json();
  }
}

export const llmProviderService = new LlmProviderService();
