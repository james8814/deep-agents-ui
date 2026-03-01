/**
 * Monkey Patch 全局 fetch，为 LangGraph API 请求自动添加 credentials
 * ⚠️ 必须在 layout.tsx 中第一个导入
 */

// 仅在浏览器环境执行
if (typeof window === "undefined") {
  throw new Error("fetchInterceptor must only be imported in browser environment");
}

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

  // 只对 LangGraph API 请求添加 credentials
  const isApiRequest =
    urlString.includes("localhost:2024") ||
    urlString.includes("api.your-domain.com");

  if (isApiRequest) {
    return originalFetch(input, {
      ...init,
      credentials: "include",
    });
  }

  return originalFetch(input, init);
};

console.log("[fetchInterceptor] 已启用 Cookie 自动携带");
