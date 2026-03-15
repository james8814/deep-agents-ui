"use client";

import { useState, useCallback, useEffect, useMemo } from "react";

/**
 * useCollapseState - Step Group 折叠状态记忆 Hook
 *
 * v5.27 工作日志分组专用
 * - 折叠状态持久化到 localStorage
 * - 过期自动清除 (7天)
 * - 当前任务默认展开, 历史任务默认折叠
 *
 * localStorage key: `panel_stepgroup_{taskId}`
 * 格式: { collapsed: boolean, timestamp: number }
 */

interface CollapseState {
  collapsed: boolean;
  timestamp: number;
}

interface UseCollapseStateOptions {
  /** 过期时间 (天), 默认 7 天 */
  expirationDays?: number;
  /** localStorage key 前缀 */
  storageKeyPrefix?: string;
}

interface UseCollapseStateReturn {
  /** 获取指定任务的折叠状态 */
  isCollapsed: (taskId: string, isCurrent: boolean) => boolean;
  /** 切换折叠状态 */
  toggleCollapse: (taskId: string) => void;
  /** 设置折叠状态 */
  setCollapsed: (taskId: string, collapsed: boolean) => void;
  /** 清除所有折叠状态 */
  clearAllStates: () => void;
  /** 清除过期状态 */
  clearExpiredStates: () => void;
}

const DEFAULT_EXPIRATION_DAYS = 7;
const DEFAULT_STORAGE_KEY_PREFIX = "panel_stepgroup_";

export function useCollapseState(
  options: UseCollapseStateOptions = {}
): UseCollapseStateReturn {
  const {
    expirationDays = DEFAULT_EXPIRATION_DAYS,
    storageKeyPrefix = DEFAULT_STORAGE_KEY_PREFIX,
  } = options;

  // 内部状态 (用于触发重渲染)
  const [, forceUpdate] = useState(0);

  // 内存缓存 (避免频繁读取 localStorage)
  const cacheRef = useMemo(() => new Map<string, boolean>(), []);

  /**
   * 获取 localStorage key
   */
  const getStorageKey = useCallback(
    (taskId: string) => `${storageKeyPrefix}${taskId}`,
    [storageKeyPrefix]
  );

  /**
   * 读取折叠状态
   */
  const readState = useCallback(
    (taskId: string): CollapseState | null => {
      // 优先使用内存缓存
      if (cacheRef.has(taskId)) {
        return null; // 缓存命中时不返回完整状态
      }

      try {
        const key = getStorageKey(taskId);
        const stored = localStorage.getItem(key);
        if (!stored) return null;

        const state: CollapseState = JSON.parse(stored);

        // 检查是否过期
        const now = Date.now();
        const expirationMs = expirationDays * 24 * 60 * 60 * 1000;
        if (now - state.timestamp > expirationMs) {
          localStorage.removeItem(key);
          return null;
        }

        return state;
      } catch {
        return null;
      }
    },
    [cacheRef, expirationDays, getStorageKey]
  );

  /**
   * 写入折叠状态
   */
  const writeState = useCallback(
    (taskId: string, collapsed: boolean) => {
      try {
        const key = getStorageKey(taskId);
        const state: CollapseState = {
          collapsed,
          timestamp: Date.now(),
        };
        localStorage.setItem(key, JSON.stringify(state));

        // 更新内存缓存
        cacheRef.set(taskId, collapsed);
      } catch (error) {
        console.warn("[useCollapseState] 写入 localStorage 失败:", error);
      }
    },
    [cacheRef, getStorageKey]
  );

  /**
   * 获取折叠状态
   * @param taskId - 任务 ID
   * @param isCurrent - 是否是当前任务 (当前任务默认展开)
   */
  const isCollapsed = useCallback(
    (taskId: string, isCurrent: boolean): boolean => {
      // 当前任务默认展开
      if (isCurrent) {
        return false;
      }

      // 检查内存缓存
      if (cacheRef.has(taskId)) {
        return cacheRef.get(taskId)!;
      }

      // 读取 localStorage
      const state = readState(taskId);
      if (state) {
        cacheRef.set(taskId, state.collapsed);
        return state.collapsed;
      }

      // 历史任务默认折叠
      return true;
    },
    [cacheRef, readState]
  );

  /**
   * 切换折叠状态
   */
  const toggleCollapse = useCallback(
    (taskId: string) => {
      const current = isCollapsed(taskId, false);
      const newCollapsed = !current;
      writeState(taskId, newCollapsed);
      forceUpdate((n) => n + 1);
    },
    [isCollapsed, writeState]
  );

  /**
   * 设置折叠状态
   */
  const setCollapsed = useCallback(
    (taskId: string, collapsed: boolean) => {
      writeState(taskId, collapsed);
      forceUpdate((n) => n + 1);
    },
    [writeState]
  );

  /**
   * 清除所有折叠状态
   */
  const clearAllStates = useCallback(() => {
    try {
      // 清除 localStorage
      Object.keys(localStorage)
        .filter((key) => key.startsWith(storageKeyPrefix))
        .forEach((key) => localStorage.removeItem(key));

      // 清除内存缓存
      cacheRef.clear();
      forceUpdate((n) => n + 1);
    } catch (error) {
      console.warn("[useCollapseState] 清除 localStorage 失败:", error);
    }
  }, [cacheRef, storageKeyPrefix]);

  /**
   * 清除过期状态
   */
  const clearExpiredStates = useCallback(() => {
    try {
      const now = Date.now();
      const expirationMs = expirationDays * 24 * 60 * 60 * 1000;

      Object.keys(localStorage)
        .filter((key) => key.startsWith(storageKeyPrefix))
        .forEach((key) => {
          try {
            const stored = localStorage.getItem(key);
            if (!stored) return;

            const state: CollapseState = JSON.parse(stored);
            if (now - state.timestamp > expirationMs) {
              localStorage.removeItem(key);

              // 清除内存缓存
              const taskId = key.replace(storageKeyPrefix, "");
              cacheRef.delete(taskId);
            }
          } catch {
            // 忽略解析错误
          }
        });
    } catch (error) {
      console.warn("[useCollapseState] 清除过期状态失败:", error);
    }
  }, [cacheRef, expirationDays, storageKeyPrefix]);

  // 组件挂载时清除过期状态
  useEffect(() => {
    clearExpiredStates();
  }, [clearExpiredStates]);

  return {
    isCollapsed,
    toggleCollapse,
    setCollapsed,
    clearAllStates,
    clearExpiredStates,
  };
}

export default useCollapseState;
