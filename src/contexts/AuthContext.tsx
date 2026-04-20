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
  useEffect(() => {
    const handler = () => {
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

      router.replace(`/login?from=${encodeURIComponent(pathname)}`);

      // 2 秒后解除去重,避免后续会话被锁
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
