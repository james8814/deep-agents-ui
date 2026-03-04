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
import type { User } from "@/types/auth";

const TOKEN_KEY = "auth_token";

/**
 * 客户端 JWT 过期预检
 * 解析 JWT payload 的 exp 字段，判断 Token 是否已过期
 * 避免向服务端发送无效 Token 产生 401 错误
 */
function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    if (!payload.exp) return false; // 无 exp 字段，无法判断，交给服务端验证
    // exp 是秒级 Unix 时间戳，留 30 秒缓冲
    return Date.now() >= (payload.exp - 30) * 1000;
  } catch {
    // 解析失败，视为过期
    return true;
  }
}

// Token 存储工具函数
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
  register: (username: string, email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);

  // 初始化：验证登录状态
  useEffect(() => {
    if (hasChecked) return;

    async function checkAuth() {
      setIsLoading(true);
      try {
        const storedToken = getStoredToken();
        if (!storedToken) {
          // 没有 token，直接标记为未登录
          setUser(null);
          setToken(null);
          return;
        }

        // 客户端预检：Token 已过期则直接清除，不发网络请求
        if (isTokenExpired(storedToken)) {
          console.debug("[Auth] Token 已过期（客户端预检），跳过网络验证");
          setUser(null);
          setToken(null);
          clearTokenFromStorage();
          return;
        }

        // 有 token 且未过期，设置并验证
        setToken(storedToken);

        // 尝试获取用户信息（使用 Bearer Token）
        const userInfo = await authApi.getUserInfo(storedToken);
        setUser(userInfo);
      } catch (error) {
        // 认证失败（401/403/Invalid token）时清除 token
        const isAuthError = error instanceof Error &&
          (error.message.includes('401') || error.message.includes('403') || error.message.includes('未登录') ||
           error.message.includes('Invalid token') || error.message.includes('token') || error.message.includes('Token'));
        if (isAuthError) {
          setUser(null);
          setToken(null);
          clearTokenFromStorage();
        } else {
          // 网络错误等：保留 token，但标记为未认证
          console.warn('[Auth] Network error during auth check:', error);
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
    // 存储 access_token
    const accessToken = response.access_token;
    saveTokenToStorage(accessToken);
    setToken(accessToken);
    // 使用 Bearer Token 获取用户信息，避免 Cookie 跨端口问题
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
