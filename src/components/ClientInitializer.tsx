"use client";

import { useEffect } from "react";

/**
 * 客户端初始化组件
 * 负责在浏览器环境执行初始化代码（如 fetchInterceptor）
 */
export function ClientInitializer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 动态导入 fetchInterceptor，确保只在客户端执行
    import("@/lib/fetchInterceptor").catch((err) => {
      console.error("[ClientInitializer] fetchInterceptor 加载失败:", err);
    });
  }, []);

  return <>{children}</>;
}
