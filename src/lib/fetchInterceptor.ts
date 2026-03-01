/**
 * Monkey Patch 全局 fetch，为 LangGraph API 请求自动添加 credentials
 * ⚠️ 必须在 layout.tsx 中通过 ClientInitializer 导入
 */

// 仅在浏览器环境执行
if (typeof window === "undefined") {
  throw new Error("fetchInterceptor must only be imported in browser environment");
}

let isPatchApplied = false;

/**
 * 检查 URL 是否需要添加 credentials
 */
function shouldAddCredentials(url: string): boolean {
  return (
    url.includes("localhost:2024") ||
    url.includes("api.your-domain.com") ||
    url.includes(process.env.NEXT_PUBLIC_API_URL || "")
  );
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

    // 只对 LangGraph API 请求添加 credentials
    if (shouldAddCredentials(urlString)) {
      return originalFetch(input, {
        ...init,
        credentials: "include",
      });
    }

    return originalFetch(input, init);
  };

  isPatchApplied = true;
  console.log("[fetchInterceptor] ✅ Cookie 自动携带已启用");
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

export default fetchInterceptorStatus;
