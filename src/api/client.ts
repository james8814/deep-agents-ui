/**
 * API 客户端封装
 * 所有请求自动携带 Bearer Token（从 localStorage 获取）
 *
 * 架构说明：
 * - 前端(:3000) 与 Auth Server(:8000) 跨端口，Cookie 无法自动发送
 * - 统一使用 Bearer Token 认证（存储在 localStorage）
 * - fetchInterceptor 覆盖 LangGraph Server 的 fetch 调用
 * - 本模块覆盖 Auth Server 的 API 调用
 */

import { ApiError } from "@/types/auth";

const AUTH_SERVER = process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:8000";
const API_SERVER = process.env.NEXT_PUBLIC_API_URL || "http://localhost:2024";

export { AUTH_SERVER, API_SERVER };

const TOKEN_KEY = "auth_token";

/**
 * 从 localStorage 获取 Bearer Token
 */
function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

// Token 刷新状态管理
let refreshPromise: Promise<void> | null = null;
let refreshRetryCount = 0;
const MAX_REFRESH_RETRIES = 3;

/**
 * 执行 Token 刷新
 * 使用 Bearer Token 而非 Cookie
 */
async function doRefreshToken(): Promise<void> {
  const token = getStoredToken();
  const response = await fetch(`${AUTH_SERVER}/auth/refresh-cookie`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
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
 * - 自动添加 Bearer Token
 * - 自动处理 401 刷新
 * - 自动处理错误
 */
export async function fetchWithCredentials<T = unknown>(
  url: string,
  options: RequestInit = {},
  isRetry: boolean = false
): Promise<T> {
  const token = getStoredToken();
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
      // 超过重试次数，抛出错误由 AuthContext + AuthGuard 统一处理重定向
      if (refreshRetryCount >= MAX_REFRESH_RETRIES) {
        refreshRetryCount = 0;
        throw new Error("登录已过期，请重新登录 (401)");
      }

      refreshRetryCount++;

      try {
        await refreshToken();
        refreshRetryCount = 0;
        // 刷新成功，重试原请求
        return fetchWithCredentials<T>(url, options, true);
      } catch {
        refreshRetryCount = 0;
        throw new Error("请重新登录 (401)");
      }
    }

    throw new Error(error.detail);
  }

  // 成功后重置计数器
  refreshRetryCount = 0;

  // 处理空响应
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : (undefined as unknown as T);
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
