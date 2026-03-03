"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

const PUBLIC_PATHS = ["/login", "/register"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, hasChecked } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!hasChecked || isLoading) return;

    const isPublicPath = PUBLIC_PATHS.some((path) =>
      pathname?.startsWith(path)
    );

    if (!isAuthenticated && !isPublicPath) {
      router.push("/login");
    }

    if (isAuthenticated && isPublicPath) {
      router.push("/");
    }
  }, [isAuthenticated, isLoading, hasChecked, pathname, router]);

  // 加载中
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

  // 未登录访问受保护页面
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname?.startsWith(path));
  if (!isAuthenticated && !isPublicPath) {
    return null;
  }

  return <>{children}</>;
}
