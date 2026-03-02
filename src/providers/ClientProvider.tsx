"use client";

import { createContext, useContext, useMemo, ReactNode, useRef, useEffect } from "react";
import { Client } from "@langchain/langgraph-sdk";

interface ClientContextValue {
  client: Client;
}

const ClientContext = createContext<ClientContextValue | null>(null);

interface ClientProviderProps {
  children: ReactNode;
  deploymentUrl: string;
  token?: string | null;  // 添加 token prop
}

export function ClientProvider({
  children,
  deploymentUrl,
  token,
}: ClientProviderProps) {
  // 使用 ref 存储 token，确保 onRequest 始终获取最新值
  const tokenRef = useRef(token);

  // 当 token 变化时更新 ref
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const client = useMemo(() => {
    return new Client({
      apiUrl: deploymentUrl,
      // 使用 onRequest hook 添加 Bearer Token
      // 通过 ref 获取最新的 token，避免闭包问题
      onRequest: (url: URL, init: RequestInit) => {
        const headers = new Headers(init.headers as HeadersInit);

        // 使用 ref 获取最新的 token
        const currentToken = tokenRef.current;
        if (currentToken) {
          headers.set("Authorization", `Bearer ${currentToken}`);
        }

        return {
          ...init,
          headers,
        };
      },
      defaultHeaders: {
        "Content-Type": "application/json",
      },
    });
  }, [deploymentUrl]);  // 只依赖 deploymentUrl，token 通过 ref 获取

  const value = useMemo(() => ({ client }), [client]);

  return (
    <ClientContext.Provider value={value}>{children}</ClientContext.Provider>
  );
}

export function useClient(): Client {
  const context = useContext(ClientContext);

  if (!context) {
    throw new Error("useClient must be used within a ClientProvider");
  }
  return context.client;
}
