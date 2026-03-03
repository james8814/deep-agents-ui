/**
 * Monkey Patch 全局 fetch，为 LangGraph API 请求自动添加 Bearer Token
 * ⚠️ 必须在 layout.tsx 中通过 ClientInitializer 导入
 */

// 仅在浏览器环境执行
if (typeof window === "undefined") {
  throw new Error("fetchInterceptor must only be imported in browser environment");
}

const TOKEN_KEY = "auth_token";

let isPatchApplied = false;

/**
 * 检查 URL 是否需要添加 Authorization header
 */
function shouldAddAuthHeader(url: string): boolean {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
  return (
    url.includes("localhost:2024") ||
    url.includes("127.0.0.1:2024") ||
    url.includes("localhost:2025") ||
    url.includes("127.0.0.1:2025") ||
    url.includes("api.your-domain.com") ||
    (apiUrl ? url.includes(apiUrl) : false)
  );
}

/**
 * 处理认证错误，清除 token 并重定向到登录页
 */
function handleAuthError(): void {
  localStorage.removeItem(TOKEN_KEY);
  window.location.href = "/login";
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

      // 处理 401/403 错误，清除 token 并重定向到登录页
      if (response.status === 401 || response.status === 403) {
        const token = getStoredToken();
        if (token) {
          console.warn(`[fetchInterceptor] 收到 ${response.status} 错误，Token 可能已过期，重定向到登录页`);
          handleAuthError();
        }
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
      console.warn(
        "[fetchInterceptor] 未启用，请检查是否存在 fetch 冲突"
      );
    }
    return isPatchApplied;
  },
};

// 暴露到 window 以便调试和测试
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).fetchInterceptorStatus = fetchInterceptorStatus;
}

export default fetchInterceptorStatus;
