import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { zhCN } from "date-fns/locale";

export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();

  // 使用 formatDistanceToNow 显示相对时间，并添加中文支持
  // addSuffix: true 会添加 "前" 或 "后"
  const relativeTime = formatDistanceToNow(date, {
    addSuffix: true,
    locale: zhCN,
  });

  // 如果是一天内，直接返回相对时间，例如 "约5小时前"
  if (now.getTime() - date.getTime() < 24 * 60 * 60 * 1000) {
    return relativeTime;
  }

  // 如果是昨天
  if (isYesterday(date)) {
    return `昨天 ${format(date, "HH:mm")}`;
  }

  // 如果是今天（理论上被前一个if覆盖，但作为保险）
  if (isToday(date)) {
    return format(date, "HH:mm");
  }

  // 如果是更早的时间，显示具体日期
  return format(date, "yyyy-MM-dd");
}
