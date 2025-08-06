export interface McpServer {
  id: number;
  name: string;
  description?: string;
  url: string;
  token: string;
  user_id?: string;
}

export type McpServerCreate = Omit<McpServer, "id">;
