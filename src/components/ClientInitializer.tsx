"use client";

import { useEffect, useState } from "react";

/**
 * 客户端初始化组件
 * 负责在浏览器环境执行初始化代码（如 fetchInterceptor）
 * 阻塞子组件渲染直到 interceptor 就绪，防止未 patch 的 fetch 发出 API 请求
 */
export function ClientInitializer({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // 动态导入 fetchInterceptor，确保只在客户端执行
    import("@/lib/fetchInterceptor")
      .then(() => {
        setIsReady(true);
      })
      .catch((err) => {
        console.error("[ClientInitializer] fetchInterceptor 加载失败:", err);
        // 加载失败也设为 ready，不阻塞应用
        setIsReady(true);
      });
  }, []);

  if (!isReady) return null;

  return <>{children}</>;
}
