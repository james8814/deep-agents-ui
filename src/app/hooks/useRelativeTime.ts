"use client";

import { useMemo } from "react";

/**
 * useRelativeTime - 相对时间显示 Hook
 *
 * 将时间戳转换为人类可读的相对时间字符串
 * - 刚刚 (< 1 分钟)
 * - X分钟前 (< 1 小时)
 * - X小时前 (< 24 小时)
 * - X天前 (>= 24 小时)
 *
 * 注意: 此 Hook 返回静态值，不会自动更新
 * 如需实时更新，请在父组件中使用 setInterval 触发重渲染
 */

export function useRelativeTime(
  timestamp: number | Date | null | undefined
): string {
  return useMemo(() => {
    if (!timestamp) return "";

    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const now = Date.now();
    const diff = now - date.getTime();

    // 负数表示未来时间
    if (diff < 0) {
      return "即将";
    }

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    // 刚刚 (< 1 分钟)
    if (seconds < 60) {
      return "刚刚";
    }

    // X分钟前 (< 1 小时)
    if (minutes < 60) {
      return `${minutes}分钟前`;
    }

    // X小时前 (< 24 小时)
    if (hours < 24) {
      return `${hours}小时前`;
    }

    // X天前 (>= 24 小时)
    if (days < 7) {
      return `${days}天前`;
    }

    // 超过 7 天，显示具体日期
    return date.toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
    });
  }, [timestamp]);
}

/**
 * 格式化耗时为可读字符串
 * @param seconds 秒数
 * @returns 格式化的时间字符串 (如 "10s", "2m 30s", "1h 15m")
 */
export function formatElapsedTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/**
 * 格式化详细耗时
 * @param startTime 开始时间戳
 * @returns 详细的时间字符串 (如 "2分30秒", "1小时15分钟")
 */
export function formatDetailedElapsedTime(startTime: number): string {
  const seconds = Math.floor((Date.now() - startTime) / 1000);

  if (seconds < 60) {
    return `${seconds}秒`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes}分${remainingSeconds}秒`
      : `${minutes}分钟`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0
    ? `${hours}小时${remainingMinutes}分钟`
    : `${hours}小时`;
}

export default useRelativeTime;
