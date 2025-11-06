/**
 * Starred Apps Local Storage Management
 * 管理用户收藏的 Bohrium MCP 应用
 */

const STARRED_APPS_KEY = "bohrium_starred_apps";

export interface StarredApp {
  appId: string;
  appName: string;
  starredAt: number;
}

/**
 * 获取所有收藏的应用
 */
export function getStarredApps(): StarredApp[] {
  try {
    const stored = localStorage.getItem(STARRED_APPS_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error("Failed to get starred apps:", error);
    return [];
  }
}

/**
 * 检查应用是否已收藏
 */
export function isAppStarred(appId: string): boolean {
  const starred = getStarredApps();
  return starred.some((app) => app.appId === appId);
}

/**
 * 添加应用到收藏
 */
export function addStarredApp(appId: string, appName: string): void {
  try {
    const starred = getStarredApps();
    // 避免重复
    if (starred.some((app) => app.appId === appId)) {
      return;
    }
    starred.push({
      appId,
      appName,
      starredAt: Date.now(),
    });
    localStorage.setItem(STARRED_APPS_KEY, JSON.stringify(starred));
  } catch (error) {
    console.error("Failed to add starred app:", error);
  }
}

/**
 * 从收藏中移除应用
 */
export function removeStarredApp(appId: string): void {
  try {
    const starred = getStarredApps();
    const filtered = starred.filter((app) => app.appId !== appId);
    localStorage.setItem(STARRED_APPS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to remove starred app:", error);
  }
}

/**
 * 切换应用收藏状态
 */
export function toggleStarredApp(appId: string, appName: string): boolean {
  const isStarred = isAppStarred(appId);
  if (isStarred) {
    removeStarredApp(appId);
    return false;
  } else {
    addStarredApp(appId, appName);
    return true;
  }
}

/**
 * 获取收藏的应用 ID 列表
 */
export function getStarredAppIds(): string[] {
  return getStarredApps().map((app) => app.appId);
}

/**
 * 清空所有收藏
 */
export function clearStarredApps(): void {
  try {
    localStorage.removeItem(STARRED_APPS_KEY);
  } catch (error) {
    console.error("Failed to clear starred apps:", error);
  }
}
