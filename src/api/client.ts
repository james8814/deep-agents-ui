/**
 * API 客户端封装
 * 所有请求自动携带 Cookie
 */

import { ApiError } from "@/types/auth";

const AUTH_SERVER = process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:8000";
const API_SERVER = process.env.NEXT_PUBLIC_API_URL || "http://localhost:2024";

export { AUTH_SERVER, API_SERVER };

// Token 刷新状态管理
let refreshPromise: Promise<void> | null = null;
let refreshRetryCount = 0;
const MAX_REFRESH_RETRIES = 3;

/**
 * 执行 Token 刷新
 */
async function doRefreshToken(): Promise<void> {
  const response = await fetch(`${AUTH_SERVER}/auth/refresh-cookie`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Token 刷新失败");
  }
}

/**
 * 获取 Token 刷新 Promise（单例模式）
 */
async function refreshToken(): Promise<void> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = doRefreshToken().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

/**
 * 通用 fetch 封装
 * - 自动携带 Cookie
 * - 自动处理 401 刷新
 * - 自动处理错误
 */
export async function fetchWithCredentials<T = unknown>(
  url: string,
  options: RequestInit = {},
  isRetry: boolean = false
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error: ApiError = await response
      .json()
      .catch(() => ({ detail: "请求失败" }));

    // 401 错误处理：尝试刷新 Token
    if (
      response.status === 401 &&
      !url.includes("/auth/") &&
      !isRetry
    ) {
      // 超过重试次数
      if (refreshRetryCount >= MAX_REFRESH_RETRIES) {
        refreshRetryCount = 0;
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        throw new Error("登录已过期，请重新登录");
      }

      refreshRetryCount++;

      try {
        await refreshToken();
        refreshRetryCount = 0;
        // 刷新成功，重试原请求
        return fetchWithCredentials<T>(url, options, true);
      } catch {
        refreshRetryCount = 0;
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        throw new Error("请重新登录");
      }
    }

    throw new Error(error.detail);
  }

  // 成功后重置计数器
  refreshRetryCount = 0;

  // 处理空响应
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/**
 * 带指数退避重试的 fetch
 * - 网络错误自动重试
 * - 401/403 不重试
 */
export async function fetchWithRetry<T>(
  url: string,
  options: RequestInit = {},
  maxRetries = 3
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetchWithCredentials<T>(url, options);
    } catch (error) {
      lastError = error as Error;

      // 不重试 401（认证问题）和 403（权限问题）
      if (error instanceof Response) {
        if (error.status === 401 || error.status === 403) {
          throw error;
        }
      }

      // 不重试非网络错误
      if (
        error instanceof Error &&
        error.message !== "Failed to fetch" &&
        !error.message.includes("Network")
      ) {
        throw error;
      }

      // 等待时间：100ms, 200ms, 400ms
      if (i < maxRetries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, 100 * Math.pow(2, i))
        );
      }
    }
  }

  throw lastError!;
}
