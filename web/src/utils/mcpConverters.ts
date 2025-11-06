/**
 * MCP Server 数据转换工具
 */

import type { BohriumApp } from "@/marketplace/types/bohrium";
import type {
  BohriumMcpData,
  BuiltinMcpData,
  ExplorableMcpServer,
} from "@/types/mcp";

// 旧格式的 builtin server 数据结构（从后端返回）
interface LegacyBuiltinServer {
  name: string;
  module_name: string;
  mount_path: string;
  description: string;
  requires_auth?: boolean;
  is_default?: boolean;
  banner?: string;
  data?: unknown;
  source?: string;
}

/**
 * 将旧格式的 builtin server 数据转换为新的 ExplorableMcpServer 格式
 * 兼容后端可能返回的多种格式
 */
export function convertToExplorableMcpServer(
  server: LegacyBuiltinServer | ExplorableMcpServer<BuiltinMcpData>,
): ExplorableMcpServer<BuiltinMcpData> {
  // 如果已经是新格式（有 data 字段），直接返回
  if ("data" in server && "source" in server && server.source === "official") {
    return server as ExplorableMcpServer<BuiltinMcpData>;
  }

  // 否则，从旧格式转换
  const legacyServer = server as LegacyBuiltinServer;
  const builtinData: BuiltinMcpData = {
    name: legacyServer.name,
    module_name: legacyServer.module_name,
    mount_path: legacyServer.mount_path,
    description: legacyServer.description,
    is_builtin: true,
    requires_auth: legacyServer.requires_auth || false,
    is_default: legacyServer.is_default,
    banner: legacyServer.banner,
  };

  return {
    id: legacyServer.module_name, // 使用 module_name 作为唯一 ID
    name: legacyServer.name,
    description: legacyServer.description,
    source: "official",
    cover: legacyServer.banner,
    data: builtinData,
  };
}

/**
 * 将 Bohrium App 转换为 ExplorableMcpServer 格式
 */
export function convertBohriumAppToMcpServer(
  app: BohriumApp,
): ExplorableMcpServer<BohriumMcpData> {
  const bohriumData: BohriumMcpData = {
    id: app.id,
    appKey: app.appKey,
    appUuid: app.appUuid,
    title: app.title,
    description: app.description,
    descriptionCn: app.descriptionCn,
    cover: app.cover,
    type: app.type,
    subscribeNum: app.subscribeNum,
    accessNum: app.accessNum,
    tags: app.tags,
  };

  return {
    id: app.appKey,
    name: app.title,
    description: app.description,
    source: "bohrium",
    cover: app.cover,
    data: bohriumData,
  };
}

/**
 * 批量转换 builtin servers
 * 接受 unknown 类型以便从后端 API 直接使用
 */
export function convertBuiltinServers(
  servers: unknown,
): ExplorableMcpServer<BuiltinMcpData>[] {
  if (!Array.isArray(servers)) {
    console.warn("convertBuiltinServers: input is not an array", servers);
    return [];
  }

  return servers
    .filter((s) => s && typeof s === "object")
    .map((s) =>
      convertToExplorableMcpServer(
        s as LegacyBuiltinServer | ExplorableMcpServer<BuiltinMcpData>,
      ),
    );
}

/**
 * 批量转换 Bohrium apps
 */
export function convertBohriumApps(
  apps: BohriumApp[],
): ExplorableMcpServer<BohriumMcpData>[] {
  return apps.map(convertBohriumAppToMcpServer);
}
