"use client";

/**
 * AuthGuard 组件 (简化版)
 *
 * 职责: 显示认证状态（加载中/已认证）
 *
 * 路由保护已迁移到 Next.js Middleware (src/middleware.ts)
 * 优点:
 * - 更早拦截 (request 级别, <1ms)
 * - 无需在每个页面重复包装
 * - 更安全（服务端检查）
 * - 更好的性能（无客户端重定向延迟）
 *
 * 使用场景:
 * - 需要显示加载状态时包装受保护页面
 * - 简单的 UI 加载指示
 *
 * 架构演进:
 * v5.27: 全局在 layout.tsx 使用 (导致 SSR 问题)
 * v5.28: 页面级使用，处理路由逻辑 (工作但维护负担)
 * v5.29: Middleware 保护，此组件仅负责 UI (最优)
 */

import { useAuth } from "@/contexts/AuthContext";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoading, hasChecked } = useAuth();

  // 显示加载状态
  if (isLoading || !hasChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-lg text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          加载中...
        </div>
      </div>
    );
  }

  // 已认证，显示内容
  // 注意: 路由级别的保护由 Middleware 处理，所以这里无需检查 isAuthenticated
  return <>{children}</>;
}
