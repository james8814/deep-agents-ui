"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Feature Flags for Ant Design X migration
 *
 * 通过 URL 参数可以覆盖默认值，便于测试：
 * - ?useAntdxMessageList=true
 * - ?useAntdxSender=true
 * - ?useAntdxThreadList=true
 * - ?useAntdxMarkdown=true
 * - ?useAntdxSubAgent=true
 *
 * 也可以通过 Settings 面板中的 "使用 Ant Design X 样式" 开关来启用
 */
export const FEATURE_FLAGS = {
  USE_ANTDX_MESSAGE_LIST: false,
  USE_ANTDX_SENDER: false,
  USE_ANTDX_THREAD_LIST: false,
  USE_ANTDX_MARKDOWN: false,
  USE_ANTDX_SUB_AGENT: false,
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

// URL 参数映射表
const URL_KEY_MAP: Record<FeatureFlagKey, string> = {
  USE_ANTDX_MESSAGE_LIST: "useAntdxMessageList",
  USE_ANTDX_SENDER: "useAntdxSender",
  USE_ANTDX_THREAD_LIST: "useAntdxThreadList",
  USE_ANTDX_MARKDOWN: "useAntdxMarkdown",
  USE_ANTDX_SUB_AGENT: "useAntdxSubAgent",
};

const CONFIG_KEY = "deep-agent-config";

/**
 * 从 localStorage 读取 useAntdX 配置
 */
function getUseAntdXFromStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (!stored) return false;
    const config = JSON.parse(stored);
    return config.useAntdX ?? false;
  } catch {
    return false;
  }
}

/**
 * Hook to read useAntdX from localStorage (reactive)
 */
export function useUseAntdX(): boolean {
  const [useAntdX, setUseAntdX] = useState(false);

  useEffect(() => {
    const readValue = () => {
      setUseAntdX(getUseAntdXFromStorage());
    };

    // Initial read
    readValue();

    // Listen for storage changes (from other tabs)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === CONFIG_KEY) {
        readValue();
      }
    };

    // Listen for custom config change event (from same tab)
    const handleConfigChange = () => {
      readValue();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("deep-agent-config-change", handleConfigChange);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("deep-agent-config-change", handleConfigChange);
    };
  }, []);

  return useAntdX;
}

/**
 * 获取 Feature Flag 值
 * URL 参数 > localStorage useAntdX > 默认配置
 */
export function useFeatureFlag(flag: FeatureFlagKey): boolean {
  const searchParams = useSearchParams();
  const useAntdX = useUseAntdX();

  // Check URL param first
  const urlKey = URL_KEY_MAP[flag];
  const urlValue = searchParams.get(urlKey);
  if (urlValue !== null) {
    return urlValue === "true" || urlValue === "1";
  }

  // If useAntdX is enabled in settings, enable all Ant Design X flags
  if (useAntdX) {
    return true;
  }

  return FEATURE_FLAGS[flag];
}

/**
 * 获取所有 Feature Flag 状态（用于调试）
 */
export function useAllFeatureFlags(): Record<FeatureFlagKey, boolean> {
  const searchParams = useSearchParams();
  const useAntdX = useUseAntdX();

  // Check URL param first
  const getFlagValue = (flag: FeatureFlagKey): boolean => {
    const urlKey = URL_KEY_MAP[flag];
    const urlValue = searchParams.get(urlKey);
    if (urlValue !== null) {
      return urlValue === "true" || urlValue === "1";
    }

    // If useAntdX is enabled in settings, enable all Ant Design X flags
    if (useAntdX) {
      return true;
    }

    return FEATURE_FLAGS[flag];
  };

  return {
    USE_ANTDX_MESSAGE_LIST: getFlagValue("USE_ANTDX_MESSAGE_LIST"),
    USE_ANTDX_SENDER: getFlagValue("USE_ANTDX_SENDER"),
    USE_ANTDX_THREAD_LIST: getFlagValue("USE_ANTDX_THREAD_LIST"),
    USE_ANTDX_MARKDOWN: getFlagValue("USE_ANTDX_MARKDOWN"),
    USE_ANTDX_SUB_AGENT: getFlagValue("USE_ANTDX_SUB_AGENT"),
  };
}
