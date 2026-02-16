"use client";

import { useSearchParams } from "next/navigation";

/**
 * Feature Flags for Ant Design X migration
 *
 * 通过 URL 参数可以覆盖默认值，便于测试：
 * - ?useAntdxMessageList=true
 * - ?useAntdxSender=true
 * - ?useAntdxThreadList=true
 * - ?useAntdxMarkdown=true
 */
export const FEATURE_FLAGS = {
  USE_ANTDX_MESSAGE_LIST: false,
  USE_ANTDX_SENDER: false,
  USE_ANTDX_THREAD_LIST: false,
  USE_ANTDX_MARKDOWN: false,
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

// URL 参数映射表
const URL_KEY_MAP: Record<FeatureFlagKey, string> = {
  USE_ANTDX_MESSAGE_LIST: "useAntdxMessageList",
  USE_ANTDX_SENDER: "useAntdxSender",
  USE_ANTDX_THREAD_LIST: "useAntdxThreadList",
  USE_ANTDX_MARKDOWN: "useAntdxMarkdown",
};

/**
 * 获取 Feature Flag 值
 * URL 参数优先于默认配置
 */
export function useFeatureFlag(flag: FeatureFlagKey): boolean {
  const searchParams = useSearchParams();

  const urlKey = URL_KEY_MAP[flag];
  const urlValue = searchParams.get(urlKey);
  if (urlValue !== null) {
    return urlValue === "true" || urlValue === "1";
  }

  return FEATURE_FLAGS[flag];
}

/**
 * 获取所有 Feature Flag 状态（用于调试）
 */
export function useAllFeatureFlags(): Record<FeatureFlagKey, boolean> {
  return {
    USE_ANTDX_MESSAGE_LIST: useFeatureFlag("USE_ANTDX_MESSAGE_LIST"),
    USE_ANTDX_SENDER: useFeatureFlag("USE_ANTDX_SENDER"),
    USE_ANTDX_THREAD_LIST: useFeatureFlag("USE_ANTDX_THREAD_LIST"),
    USE_ANTDX_MARKDOWN: useFeatureFlag("USE_ANTDX_MARKDOWN"),
  };
}
