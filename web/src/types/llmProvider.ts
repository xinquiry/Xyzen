export interface LlmProvider {
  id: number;
  Name: string;
  Api: string;
  Key: string;
  Model: string;
  MaxTokens: number | null;
  Temperature: number | null;
  Timeout: number | null;
  is_active?: boolean;
  is_available?: boolean;
  provider_type?: string;
}

export interface LlmProviderCreate {
  Name: string;
  Api: string;
  Key: string;
  Model: string;
  MaxTokens?: number | null;
  Temperature?: number | null;
  Timeout?: number | null;
}

export interface LlmProviderResponse extends LlmProvider {
  is_active: boolean;
  is_available: boolean;
  provider_type: string;
}

export interface SwitchProviderRequest {
  provider_id: number;
}

export interface SupportedProviderType {
  type: string;
  description: string;
}
