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
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">加载中...</div>
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
