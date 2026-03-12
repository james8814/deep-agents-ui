"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import * as authApi from "@/api/auth";
import { HttpError } from "@/api/client";
import type { User } from "@/types/auth";
import { TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/lib/constants";

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const raw = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = raw.padEnd(raw.length + ((4 - (raw.length % 4)) % 4), "=");
    const payload = JSON.parse(atob(padded));
    if (typeof payload.exp !== "number") return false;
    return Date.now() >= payload.exp * 1000 - 30_000;
  } catch {
    return true;
  }
}

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
          return;
        }

        const storedToken = getStoredToken();
        if (!storedToken) {
          setUser(null);
          setToken(null);
          return;
        }

        if (isTokenExpired(storedToken)) {
          console.debug("[Auth] Token 已过期（客户端预检），跳过网络验证");
          setUser(null);
          setToken(null);
          clearTokenFromStorage();
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
          setUser(null);
          setToken(null);
          clearTokenFromStorage();
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

    // 为 Middleware 路由保护设置 cookie
    // Cookie 允许 Next.js Middleware 在请求级别检查认证状态
    // 比 localStorage 更安全（不易被 XSS 窃取）
    if (typeof window !== "undefined") {
      document.cookie = `auth_token=${accessToken}; path=/; max-age=86400; SameSite=Strict`;
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

      // 清除 Middleware 使用的认证 cookie
      if (typeof window !== "undefined") {
        document.cookie = "auth_token=; path=/; max-age=0; SameSite=Strict";
      }
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
