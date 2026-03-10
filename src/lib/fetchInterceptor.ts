/**
 * Monkey Patch 全局 fetch，为 LangGraph API 请求自动添加 Bearer Token
 * ⚠️ 必须在 layout.tsx 中通过 ClientInitializer 导入
 */

// 仅在浏览器环境执行
if (typeof window === "undefined") {
  throw new Error(
    "fetchInterceptor must only be imported in browser environment"
  );
}

import { TOKEN_KEY } from "@/lib/constants";

let isPatchApplied = false;

/**
 * 检查 URL 是否需要添加 Authorization header
 *
 * 覆盖范围：
 * - LangGraph Server (:2024/:2025) — Agent API 调用
 * - Auth Server (:8000) 的 /api/ 端点 — 文件上传/下载/删除
 *   注意：/auth/ 端点不需要（登录/注册本身不需要 token）
 */
function shouldAddAuthHeader(url: string): boolean {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
  const authUrl = process.env.NEXT_PUBLIC_AUTH_URL || "";

  // LangGraph Server
  if (
    url.includes("localhost:2024") ||
    url.includes("127.0.0.1:2024") ||
    url.includes("localhost:2025") ||
    url.includes("127.0.0.1:2025") ||
    (apiUrl ? url.includes(apiUrl) : false)
  ) {
    return true;
  }

  // Auth Server 的 /api/ 端点（上传/下载/删除文件等需要认证的端点）
  const isAuthServerUrl =
    url.includes("localhost:8000") ||
    url.includes("127.0.0.1:8000") ||
    (authUrl ? url.includes(authUrl) : false);

  if (isAuthServerUrl && url.includes("/api/")) {
    return true;
  }

  return false;
}

/**
 * 从 localStorage 获取 token
 */
function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

try {
  const originalFetch = window.fetch;

  window.fetch = async function patchedFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const urlString =
      input instanceof Request
        ? input.url
        : input instanceof URL
        ? input.href
        : input.toString();

    // 只对 LangGraph API 请求添加 Authorization header
    if (shouldAddAuthHeader(urlString)) {
      const token = getStoredToken();

      // 创建新的 headers，保留原有的 headers
      const headers = new Headers(init?.headers as HeadersInit);

      // 添加 Bearer Token
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      const response = await originalFetch(input, {
        ...init,
        headers,
        // 不再使用 credentials: "include"，因为 Cookie 跨端口不发送
        // credentials: "include",
      });

      // 401/403 仅记录日志，认证状态由 AuthContext + AuthGuard 统一管理
      if (response.status === 401 || response.status === 403) {
        console.debug(
          `[fetchInterceptor] 收到 ${response.status}，由 AuthContext 处理`
        );
      }

      return response;
    }

    return originalFetch(input, init);
  };

  isPatchApplied = true;
  console.log("[fetchInterceptor] ✅ Bearer Token 自动添加已启用");
} catch (error) {
  console.error("[fetchInterceptor] ❌ Patch 失败，将使用原始 fetch", error);
}

/**
 * fetchInterceptor 状态
 */
export const fetchInterceptorStatus = {
  isApplied: isPatchApplied,
  isEnabled: () => {
    if (!isPatchApplied) {
      console.warn("[fetchInterceptor] 未启用，请检查是否存在 fetch 冲突");
    }
    return isPatchApplied;
  },
};

// 暴露到 window 以便调试和测试
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).fetchInterceptorStatus =
    fetchInterceptorStatus;
}

export default fetchInterceptorStatus;
