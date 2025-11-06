/**
 * Unified MCP Market List
 * 统一的 MCP 市场列表，整合 Official 和 Bohrium
 */

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/animate-ui/components/radix/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type { BohriumMcpData, ExplorableMcpServer } from "@/types/mcp";
import { isBohriumMcp } from "@/types/mcp";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useBohriumInfiniteAppList } from "../hooks/useBohriumMcp";
import { getStarredAppIds } from "../utils/starredApps";
import McpServerCard from "./McpServerCard";

interface UnifiedMcpMarketListProps {
  builtinServers: ExplorableMcpServer[];
  onSelectServer?: (server: ExplorableMcpServer) => void;
}

const UnifiedMcpMarketList: React.FC<UnifiedMcpMarketListProps> = ({
  builtinServers,
  onSelectServer,
}) => {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<
    "all" | "official" | "bohrium"
  >("all");
  const [starredApps, setStarredApps] = useState<Set<string>>(new Set());
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"none" | "stars" | "usage" | "alpha">(
    "none",
  );
  const PAGE_SIZE = 20;

  // Bohrium 应用后台无限抓取，UI 始终分页展示（每页 20 条）
  const infinite = useBohriumInfiniteAppList(36, debouncedSearch);
  const {
    hasNextPage,
    fetchNextPage,
    // error exposed via infinite.error below when needed
  } = infinite;

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 切换来源、排序或搜索时回到第 1 页
  useEffect(() => {
    setPage(1);
  }, [sourceFilter, sortBy, debouncedSearch]);

  // 加载收藏状态（在 Bohrium 应用集合变化时同步）

  // 转换 Bohrium 应用为统一格式
  const rawBohriumApps = useMemo(() => infinite.apps, [infinite.apps]);

  const bohriumServers: ExplorableMcpServer<BohriumMcpData>[] = useMemo(() => {
    return rawBohriumApps.map((app) => ({
      id: `bohrium-${app.appKey}`,
      name: app.title,
      description: app.description || app.descriptionCn,
      source: "bohrium" as const,
      cover: app.cover,
      data: app,
    }));
  }, [rawBohriumApps]);

  // 加载收藏状态（仅在组件挂载时加载一次）
  useEffect(() => {
    const starred = new Set(getStarredAppIds());
    setStarredApps(starred);
  }, []);

  // 合并所有服务器
  const allServers = useMemo(() => {
    const servers: ExplorableMcpServer[] = [];

    // 添加 builtin servers
    if (sourceFilter === "all" || sourceFilter === "official") {
      servers.push(...builtinServers);
    }

    // 添加 Bohrium servers
    if (sourceFilter === "all" || sourceFilter === "bohrium") {
      servers.push(...bohriumServers);
    }

    let result = servers;

    // 客户端搜索（仅当不是 Bohrium 专属过滤时）
    if (searchQuery && sourceFilter !== "bohrium") {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (server) =>
          server.name.toLowerCase().includes(query) ||
          server.description.toLowerCase().includes(query),
      );
    }

    // 只看收藏
    if (showStarredOnly) {
      result = result.filter((s) => starredApps.has(s.id));
    }

    // 用户手动排序（默认不排序，保持抓取顺序）
    if (sortBy !== "none") {
      // 保留原始顺序用于稳定排序的兜底
      const withIndex = result.map((item, idx) => ({ item, idx }));
      withIndex.sort((a, b) => {
        if (sortBy === "alpha") {
          const cmp = a.item.name.localeCompare(b.item.name, undefined, {
            sensitivity: "base",
          });
          return cmp !== 0 ? cmp : a.idx - b.idx;
        }
        if (sortBy === "stars") {
          const av = isBohriumMcp(a.item)
            ? (a.item.data.subscribeNum ?? -Infinity)
            : -Infinity;
          const bv = isBohriumMcp(b.item)
            ? (b.item.data.subscribeNum ?? -Infinity)
            : -Infinity;
          return bv - av || a.idx - b.idx;
        }
        if (sortBy === "usage") {
          const av = isBohriumMcp(a.item)
            ? (a.item.data.accessNum ?? -Infinity)
            : -Infinity;
          const bv = isBohriumMcp(b.item)
            ? (b.item.data.accessNum ?? -Infinity)
            : -Infinity;
          return bv - av || a.idx - b.idx;
        }
        return a.idx - b.idx;
      });
      result = withIndex.map((x) => x.item);
    }

    return result;
  }, [
    builtinServers,
    bohriumServers,
    sourceFilter,
    searchQuery,
    showStarredOnly,
    starredApps,
    sortBy,
  ]);

  const isStarred = (serverId: string) => starredApps.has(serverId);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  // 后台自动拉取直到全部抓取完成（逐页推进，使用 latch 避免重复触发）
  const drainingRef = useRef(false);
  useEffect(() => {
    // 仅在包含 Bohrium 时后台拉取
    if (sourceFilter === "official") return;
    if (drainingRef.current) return;
    if (!hasNextPage) {
      console.log(
        `[Bohrium] 所有数据已加载完成: ${rawBohriumApps.length} 个应用`,
      );
      return;
    }

    console.log(
      `[Bohrium] 继续拉取下一页，当前已有 ${rawBohriumApps.length} 个应用，hasNextPage=${hasNextPage}`,
    );
    drainingRef.current = true;
    fetchNextPage()
      .then(() => {
        console.log(
          `[Bohrium] 第 ${rawBohriumApps.length / 36 + 1} 页拉取完成`,
        );
      })
      .catch((err) => {
        console.error(`[Bohrium] 拉取失败:`, err);
      })
      .finally(() => {
        drainingRef.current = false;
      });
    // 依赖 hasNextPage、sourceFilter 和 rawBohriumApps.length，确保每次数据更新后重新检查
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasNextPage, sourceFilter, rawBohriumApps.length]);

  const loading = infinite.loading;

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="flex gap-4 items-center">
        <form onSubmit={handleSearch} className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="搜索 MCP 服务..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-4 text-neutral-900 placeholder-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
          />
        </form>

        {/* Source Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800">
              <span>来源</span>
              {sourceFilter === "bohrium" && (
                <img
                  src="https://storage.sciol.ac.cn/library/browser-fav.png"
                  alt="Bohrium"
                  className="w-5 h-5"
                />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent sideOffset={8} className="min-w-[120px]">
            <DropdownMenuLabel>来源</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => setSourceFilter("all")}>
              All
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setSourceFilter("official")}>
              Official
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setSourceFilter("bohrium")}>
              <span className="flex items-center gap-2">
                <img
                  src="https://storage.sciol.ac.cn/library/browser-fav.png"
                  alt="Bohrium"
                  className="w-4 h-4"
                />
                Bohrium
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sort Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800">
              <span>排序</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent sideOffset={8} className="min-w-[160px]">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => setSortBy("stars")}>
              收藏数（降序）
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setSortBy("usage")}>
              使用数（降序）
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setSortBy("alpha")}>
              首字母排序（A→Z）
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Starred Checkbox */}
        {/* <div className="flex items-center gap-x-3 select-none">
          <Checkbox
            checked={showStarredOnly}
            onChange={(checked) => setShowStarredOnly(!!checked)}
            variant="default"
            size="sm"
          />
          <span>只看收藏</span>
        </div> */}
      </div>

      {/* Stats */}
      <div className="text-sm text-neutral-500 dark:text-neutral-400">
        共找到 {allServers.length} 个服务
        {sourceFilter !== "official" && (
          <span>
            {" "}
            (Bohrium: 已加载 {rawBohriumApps.length} 个
            {infinite.totalCount > 0 && `, 总计 ${infinite.totalCount} 个`}
            {hasNextPage && ", 加载中..."})
          </span>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
            <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
              加载中...
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {infinite.error && sourceFilter !== "official" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400">
            {infinite.error}
          </p>
        </div>
      )}

      {/* Server Grid */}
      {!loading && allServers.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-16 md:grid-cols-2 lg:grid-cols-3">
            {allServers
              .slice((page - 1) * PAGE_SIZE, (page - 1) * PAGE_SIZE + PAGE_SIZE)
              .map((server, index) => (
                <motion.div
                  key={server.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <McpServerCard
                    server={server}
                    isStarred={isStarred(server.id)}
                    onClick={() => onSelectServer?.(server)}
                  />
                </motion.div>
              ))}
          </div>

          {/* Pagination for all sources (20 per page) */}
          {Math.ceil(allServers.length / PAGE_SIZE) > 1 && (
            <div className="flex items-center justify-center pt-8">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setPage((p) => Math.max(1, p - 1));
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    />
                  </PaginationItem>
                  {Array.from({
                    length: Math.ceil(allServers.length / PAGE_SIZE),
                  })
                    .slice(0, 7)
                    .map((_, i) => {
                      const pageNum = i + 1;
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            href="#"
                            isActive={pageNum === page}
                            onClick={(e) => {
                              e.preventDefault();
                              setPage(pageNum);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                  {Math.ceil(allServers.length / PAGE_SIZE) > 7 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        const tp = Math.ceil(allServers.length / PAGE_SIZE);
                        setPage((p) => Math.min(tp, p + 1));
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!loading && allServers.length === 0 && (
        <div className="py-12 text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="mb-2 text-lg font-semibold text-neutral-800 dark:text-white">
            未找到服务
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            尝试调整搜索条件或切换来源
          </p>
        </div>
      )}
    </div>
  );
};

export default UnifiedMcpMarketList;
