/**
 * API 客户端封装
 * Auth Server API 请求的错误处理和 Token 刷新
 *
 * 架构说明：
 * - Token 注入职责分工：
 *   - fetchInterceptor（A层）：覆盖 LangGraph Server + Auth Server /api/ 端点
 *   - ClientProvider onRequest（B层）：覆盖 LangGraph SDK client 方法
 *   - 本模块不做 Token 注入，只负责错误处理和 Token 刷新
 * - Auth Server /auth/ 端点的 Token 由调用方按需显式传入（如 auth.ts 的 getUserInfo）
 */

import { ApiError } from "@/types/auth";
import { TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/lib/constants";

/**
 * P1-2: 统一派发 auth-error 事件
 * 供 AuthProvider 订阅后清本地态 + 跳转登录
 * 统一从此处派发,避免 fetchInterceptor/upload/useChat 多路重复派发
 */
export function emitAuthError(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("auth-error"));
  }
}

const AUTH_SERVER = process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:8000";
const API_SERVER = process.env.NEXT_PUBLIC_API_URL || "http://localhost:2024";

export { AUTH_SERVER, API_SERVER };

/**
 * 带 HTTP 状态码的错误类
 * 用于 AuthContext 等消费方通过 statusCode 判断错误类型，而非脆弱的字符串匹配
 */
export class HttpError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = "HttpError";
  }
}

/**
 * 从 localStorage 获取 Bearer Token
 * 注：当前未使用，保留供未来 Token 验证功能
 */
function _getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * 从 localStorage 获取 Refresh Token
 */
function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * 存储新的 Token 对到 localStorage
 */
function storeTokenPair(accessToken: string, refreshToken?: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

// Token 刷新状态管理
let refreshPromise: Promise<void> | null = null;
let refreshRetryCount = 0;
const MAX_REFRESH_RETRIES = 3;

/**
 * 执行 Token 刷新
 * 使用 /auth/refresh 端点 + JSON body（跨端口可用）
 * 不同于 /auth/refresh-cookie（依赖 Cookie，跨端口失效）
 */
async function doRefreshToken(): Promise<void> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  const response = await fetch(`${AUTH_SERVER}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    throw new Error("Token 刷新失败");
  }

  // 解析响应并存储新的 Token 对
  const data = await response.json();
  storeTokenPair(data.access_token, data.refresh_token);
}

/**
 * 获取 Token 刷新 Promise（单例模式）
 *
 * P1: 已 export,供 upload.ts 等 XHR 路径手工触发 refresh
 */
export async function refreshToken(): Promise<void> {
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
 * - 不做 Token 注入（由 fetchInterceptor 或调用方负责）
 * - 自动处理 401 刷新（非 /auth/ 端点）
 * - 抛出 HttpError 携带 statusCode，便于消费方判断错误类型
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

    // 401 错误处理：尝试刷新 Token（仅非 /auth/ 端点）
    if (response.status === 401 && !url.includes("/auth/") && !isRetry) {
      if (refreshRetryCount >= MAX_REFRESH_RETRIES) {
        refreshRetryCount = 0;
        emitAuthError();
        throw new HttpError("登录已过期，请重新登录", 401);
      }

      refreshRetryCount++;

      try {
        await refreshToken();
        refreshRetryCount = 0;
        return fetchWithCredentials<T>(url, options, true);
      } catch {
        refreshRetryCount = 0;
        // P1-2: refresh 彻底失败,通知 AuthProvider 做跳转登录
        emitAuthError();
        throw new HttpError("请重新登录", 401);
      }
    }

    // 抛出 HttpError，携带状态码
    throw new HttpError(error.detail, response.status);
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
