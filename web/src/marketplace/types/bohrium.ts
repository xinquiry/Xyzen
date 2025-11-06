/**
 * Bohrium Marketplace Types
 * 定义 Bohrium 平台相关的数据类型
 */

/**
 * Bohrium 应用基础信息
 */
export interface BohriumApp {
  id: number;
  appKey: string;
  appUuid: string;
  title: string;
  description: string;
  descriptionCn: string;
  cover: string;
  type: number;
  machineType: string;
  subscribeNum: number;
  accessNum: number;
  latestVersion?: string;
  tags?: BohriumTag[];
  authors?: BohriumAuthor[];
  keywords?: string;
}

/**
 * Bohrium 应用详细信息
 */
export interface BohriumAppDetail extends BohriumApp {
  latestDeploymentId: number;
  readmeLink?: string;
  readmeLinkCn?: string;
  helpLink?: string;
  helpLinkCn?: string;
  createTime: string;
  updateTime: string;
  status: number;
  spacePath: string;
  changeLogs?: BohriumChangeLog[];
}

/**
 * Bohrium 标签
 */
export interface BohriumTag {
  id: number;
  name: string;
  theme: string;
  customTheme?: string;
}

/**
 * Bohrium 作者信息
 */
export interface BohriumAuthor {
  userId: number;
  userName: string;
  avatarUrl?: string;
  email?: string;
  extId?: string;
}

/**
 * Bohrium 更新日志
 */
export interface BohriumChangeLog {
  id: number;
  version: string;
  changelog: string;
  createTime: string;
}

/**
 * Bohrium API 响应
 */
export interface BohriumApiResponse<T> {
  code: number;
  data: T;
  message?: string;
}

/**
 * Bohrium 应用列表响应
 */
export interface BohriumAppListResponse {
  items: BohriumApp[]; // 实际 API 返回 items
  total: number; // 实际 API 返回 total
  page: number;
  pageSize: number;
  totalPage: number; // 实际 API 返回 totalPage
}

/**
 * Bohrium MCP 服务配置
 */
export interface BohriumMcpConfig {
  mcpServers: {
    [key: string]: {
      url: string;
    };
  };
}

/**
 * MCP 激活状态
 */
export enum McpActivationStatus {
  IDLE = "idle",
  FETCHING_DETAIL = "fetching_detail",
  ACTIVATING = "activating",
  POLLING = "polling",
  SUCCESS = "success",
  ERROR = "error",
  TIMEOUT = "timeout",
}

/**
 * MCP 激活进度信息
 */
export interface McpActivationProgress {
  status: McpActivationStatus;
  message: string;
  progress: number; // 0-100
  deploymentId?: number;
  endpoint?: {
    url: string;
    token: string;
  };
  error?: string;
  retryCount?: number;
}

/**
 * Bohrium 认证配置
 */
export interface BohriumAuthConfig {
  accessKey: string;
  appKey: string;
}
