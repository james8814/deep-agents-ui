"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";

const PUBLIC_PREFIXES = ["/login", "/register", "/demo", "/antd-x-poc"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { token, user, isLoading, hasChecked } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || "/";

  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
  // 关键：用 token || user 判断，避免登录/登出/刷新瞬态误跳
  const effectivelyAuthed = !!token || !!user;

  useEffect(() => {
    if (!hasChecked) return;
    if (!effectivelyAuthed && !isPublic) {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`);
    }
  }, [hasChecked, effectivelyAuthed, isPublic, pathname, router]);

  if (isLoading || !hasChecked) return <LoadingUI />;
  // 避免主页 flash 后才跳转的视觉残影
  if (!effectivelyAuthed && !isPublic) return <LoadingUI />;
  return <>{children}</>;
}

function LoadingUI() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex items-center gap-2 text-lg text-muted-foreground">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        加载中...
      </div>
    </div>
  );
}
