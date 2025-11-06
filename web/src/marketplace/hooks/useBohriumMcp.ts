/**
 * Bohrium MCP Hooks
 * 提供 Bohrium MCP 相关的状态管理和操作
 */

import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { bohriumService } from "../services/bohriumService";
import type {
  McpActivationProgress,
  McpActivationStatus,
} from "../types/bohrium";

/**
 * React Query 键工厂
 */
const bohriumKeys = {
  all: ["bohrium"] as const,
  apps: () => [...bohriumKeys.all, "apps"] as const,
  appList: (page: number, pageSize: number, search: string) =>
    [...bohriumKeys.apps(), { page, pageSize, search }] as const,
  appDetail: (appKey: string) => [...bohriumKeys.all, "app", appKey] as const,
  appListInfinite: (pageSize: number, search: string) =>
    [...bohriumKeys.apps(), "infinite", { pageSize, search }] as const,
};

/**
 * 使用 Bohrium 应用列表 (with React Query)
 */
export const useBohriumAppList = (
  page: number = 1,
  pageSize: number = 36,
  searchQuery: string = "",
) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: bohriumKeys.appList(page, pageSize, searchQuery),
    queryFn: () => bohriumService.getAppList(page, pageSize, searchQuery),
    staleTime: 5 * 60 * 1000, // 5 分钟
    gcTime: 10 * 60 * 1000, // 10 分钟
  });

  const prefetchNextPage = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: bohriumKeys.appList(page + 1, pageSize, searchQuery),
      queryFn: () => bohriumService.getAppList(page + 1, pageSize, searchQuery),
    });
  }, [queryClient, page, pageSize, searchQuery]);

  return {
    apps: query.data?.items || [],
    totalCount: query.data?.total || 0,
    totalPages: query.data?.totalPage || 1,
    currentPage: query.data?.page || page,
    loading: query.isLoading,
    error: query.error?.message || null,
    isError: query.isError,
    refetch: query.refetch,
    prefetchNextPage,
  };
};

/**
 * 使用 Bohrium 应用列表（无限加载版）
 */
export const useBohriumInfiniteAppList = (
  pageSize: number = 36,
  searchQuery: string = "",
) => {
  const query = useInfiniteQuery({
    queryKey: bohriumKeys.appListInfinite(pageSize, searchQuery),
    queryFn: async ({ pageParam = 1 }) => {
      console.log(`[Bohrium API] 请求第 ${pageParam} 页，每页 ${pageSize} 条`);
      const result = await bohriumService.getAppList(
        pageParam as number,
        pageSize,
        searchQuery,
      );
      console.log(
        `[Bohrium API] 第 ${pageParam} 页返回 ${result.items?.length || 0} 条，总计 ${result.total} 条，共 ${result.totalPage} 页`,
      );
      return result;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const next = (lastPage.page || 1) + 1;
      const hasMore = next <= (lastPage.totalPage || 1);
      console.log(
        `[Bohrium API] getNextPageParam: 当前页 ${lastPage.page}, 下一页 ${next}, 总页数 ${lastPage.totalPage}, hasMore=${hasMore}`,
      );
      return hasMore ? next : undefined;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const apps = (query.data?.pages || []).flatMap((p) => p.items || []);
  const totalCount = query.data?.pages?.[0]?.total || 0;
  const totalPages = query.data?.pages?.[0]?.totalPage || 1;
  const pageCount = query.data?.pages?.length || 0;

  return {
    apps,
    totalCount,
    totalPages,
    pageCount,
    loading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: !!query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
    error: query.error?.message || null,
    isError: query.isError,
  };
};

/**
 * 使用 Bohrium 应用详情 (with React Query)
 */
export const useBohriumAppDetail = (appKey?: string) => {
  const query = useQuery({
    queryKey: bohriumKeys.appDetail(appKey || ""),
    queryFn: () => {
      if (!appKey) throw new Error("appKey is required");
      return bohriumService.getAppDetail(appKey);
    },
    enabled: !!appKey,
    staleTime: 10 * 60 * 1000, // 10 分钟
    gcTime: 30 * 60 * 1000, // 30 分钟
  });

  return {
    detail: query.data || null,
    loading: query.isLoading,
    error: query.error?.message || null,
    isError: query.isError,
    refetch: query.refetch,
  };
};

/**
 * 使用 MCP 激活流程
 */
export const useMcpActivation = () => {
  const [progress, setProgress] = useState<McpActivationProgress>({
    status: "idle" as McpActivationStatus,
    message: "",
    progress: 0,
  });

  const activateMcp = useCallback(async (appKey: string) => {
    try {
      // Step 1: 获取应用详情
      setProgress({
        status: "fetching_detail" as McpActivationStatus,
        message: "正在获取应用信息...",
        progress: 10,
      });

      const detail = await bohriumService.getAppDetail(appKey);

      if (!detail.latestDeploymentId) {
        throw new Error("No deployment ID found for this app");
      }

      // Step 2: 开始激活
      setProgress({
        status: "activating" as McpActivationStatus,
        message: "正在启动 Bohrium 沙盒环境...",
        progress: 30,
        deploymentId: detail.latestDeploymentId,
      });

      // Step 3: 轮询获取端点
      setProgress({
        status: "polling" as McpActivationStatus,
        message: "正在等待沙盒就绪...",
        progress: 50,
        deploymentId: detail.latestDeploymentId,
      });

      const endpoint = await bohriumService.waitForMcpEndpoint(
        detail.latestDeploymentId,
        15,
        3000,
        (retryCount, maxRetries) => {
          const progressPercent = 50 + (retryCount / maxRetries) * 40;
          setProgress({
            status: "polling" as McpActivationStatus,
            message: `正在等待沙盒就绪... (${retryCount}/${maxRetries})`,
            progress: progressPercent,
            deploymentId: detail.latestDeploymentId,
            retryCount,
          });
        },
      );

      // Step 4: 成功
      setProgress({
        status: "success" as McpActivationStatus,
        message: "MCP 服务已就绪！",
        progress: 100,
        deploymentId: detail.latestDeploymentId,
        endpoint,
      });

      return {
        detail,
        endpoint,
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Activation failed";

      setProgress({
        status: "error" as McpActivationStatus,
        message: errorMessage,
        progress: 0,
        error: errorMessage,
      });

      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setProgress({
      status: "idle" as McpActivationStatus,
      message: "",
      progress: 0,
    });
  }, []);

  return {
    progress,
    activateMcp,
    reset,
  };
};

/**
 * 检查 Bohrium 认证状态
 */
export const useBohriumAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsAuthenticated(bohriumService.isAuthenticated());
  }, []);

  return {
    isAuthenticated,
  };
};
