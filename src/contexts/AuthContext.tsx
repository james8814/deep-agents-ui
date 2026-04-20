"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import * as authApi from "@/api/auth";
import { HttpError } from "@/api/client";
import type { User } from "@/types/auth";
import { TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/lib/constants";

function saveTokenToStorage(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function clearTokenFromStorage(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
  }
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasChecked: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string
  ) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);
  const router = useRouter();
  const pathname = usePathname() || "/";
  const isHandlingAuthErrorRef = useRef(false);

  // P1-2: 监听运行时 401 → 统一清态 + 跳转登录
  // 去重防并发 401 重复跳转;pathname 检查防在 /login 页自循环
  //
  // 注意:此处用 window.location.replace 而非 next/navigation 的 router.replace。
  // 原因:本项目 HomePage 用 nuqs (useQueryState) 管控 URL query,与 App Router 的
  // client-side navigation 会发生竞态——实测 router.replace 发起的跳转被 nuqs 的
  // URL 回写覆盖,导致跳转不生效。401 登出场景下硬刷新反而更安全(清空所有
  // React/SWR/LangGraph stream 状态),是合理取舍。
  useEffect(() => {
    const handler = async () => {
      if (isHandlingAuthErrorRef.current) return;
      isHandlingAuthErrorRef.current = true;

      if (pathname.startsWith("/login")) {
        isHandlingAuthErrorRef.current = false;
        return;
      }

      // 三处同步清理(v1.2 P2-4 原子同步原则)
      clearTokenFromStorage();
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      setUser(null);
      setToken(null);

      // 关键:必须先让后端清 HttpOnly cookie,否则 middleware 会把 /login 反弹回 /
      // (JS 无法覆写 HttpOnly cookie,必须走 /auth/logout-cookie)
      // 加 2s timeout 兜底,网络挂起不阻塞跳转
      try {
        await Promise.race([
          authApi.logout(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("logout timeout")), 2000)
          ),
        ]);
      } catch {
        // 即便后端清 cookie 失败也继续跳转;middleware 的 exp 校验会兜底
        // (stale cookie 若 exp 已过,会被 P0-1 的 validToken 检查识别并清掉)
      }

      if (typeof window !== "undefined") {
        const target = `/login?from=${encodeURIComponent(pathname)}`;
        window.location.replace(target);
      }

      // 2 秒后解除去重(防御,此时页面已在刷新)
      setTimeout(() => {
        isHandlingAuthErrorRef.current = false;
      }, 2000);
    };
    window.addEventListener("auth-error", handler);
    return () => window.removeEventListener("auth-error", handler);
  }, [router, pathname]);

  useEffect(() => {
    if (hasChecked) return;

    async function checkAuth() {
      setIsLoading(true);
      try {
        // Demo Authentication: Auto-login with demo user
        // 仅当 NEXT_PUBLIC_DEMO_AUTH_ENABLED=true 时启用
        // 这是为开发环境提供无缝自动登录的合规方案
        if (
          typeof window !== "undefined" &&
          process.env.NEXT_PUBLIC_DEMO_AUTH_ENABLED === "true"
        ) {
          const demoToken = "demo-dev-token";
          const demoUser: User = {
            id: "demo_dev_user",
            username: "Developer",
            email: "dev@example.com",
          };
          setToken(demoToken);
          setUser(demoUser);
          console.debug("[Auth] Demo authentication enabled");
          // ✅ Bug 修复: 在 return 前设置状态，确保 AuthGuard 不会卡在加载状态
          setIsLoading(false);
          setHasChecked(true);
          return;
        }

        const storedToken = getStoredToken();
        if (!storedToken) {
          setUser(null);
          setToken(null);
          return;
        }

        setToken(storedToken);
        const userInfo = await authApi.getUserInfo(storedToken);
        setUser(userInfo);
      } catch (error) {
        const isAuthError =
          error instanceof HttpError &&
          (error.statusCode === 401 || error.statusCode === 403);
        if (isAuthError) {
          // 此时 fetchWithCredentials 内部 refresh 已试过且失败，cookie 需彻底失效
          authApi.logout().catch(() => {});  // fire-and-forget，不阻塞 UI
          setUser(null);
          setToken(null);
          clearTokenFromStorage();
          localStorage.removeItem(REFRESH_TOKEN_KEY);
        } else {
          console.warn("[Auth] Network error during auth check:", error);
          setUser(null);
        }
      } finally {
        setIsLoading(false);
        setHasChecked(true);
      }
    }

    checkAuth();
  }, [hasChecked]);

  const login = useCallback(async (username: string, password: string) => {
    const response = await authApi.login({ username, password });
    const accessToken = response.access_token;
    saveTokenToStorage(accessToken);
    setToken(accessToken);
    if (response.refresh_token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, response.refresh_token);
    }

    const userInfo = await authApi.getUserInfo(accessToken);
    setUser(userInfo);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setToken(null);
      clearTokenFromStorage();
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  }, []);

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      await authApi.register({ username, email, password });
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        hasChecked,
        login,
        logout,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
