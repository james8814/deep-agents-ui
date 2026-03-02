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
        if (storedToken) {
          setToken(storedToken);
        }

        // 尝试获取用户信息（使用 Cookie 或 Bearer Token）
        const userInfo = await authApi.getUserInfo(storedToken || undefined);
        setUser(userInfo);
      } catch (error) {
        // 只有在真正的认证失败（401）时才清除 token
        // 网络错误等其他情况不清除
        const isAuthError = error instanceof Error &&
          (error.message.includes('401') || error.message.includes('未登录') || error.message.includes('Token'));
        if (isAuthError) {
          setUser(null);
          setToken(null);
          clearTokenFromStorage();
        } else {
          // 网络错误等：保留 token，但标记为未认证
          console.warn('[Auth] Failed to verify auth status:', error);
          // 如果有 token，仍然设置为已认证（乐观策略）
          const storedToken = getStoredToken();
          if (storedToken) {
            setToken(storedToken);
            // 设置一个临时用户对象，等待网络恢复后再验证
            setUser({ id: 'pending', username: 'User', email: '', is_active: true });
          }
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
