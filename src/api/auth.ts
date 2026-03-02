/**
 * 认证相关 API
 */

import { fetchWithCredentials, AUTH_SERVER } from "./client";
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  User,
} from "@/types/auth";

export async function register(data: RegisterRequest): Promise<User> {
  return fetchWithCredentials<User>(`${AUTH_SERVER}/auth/register`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  return fetchWithCredentials<LoginResponse>(
    `${AUTH_SERVER}/auth/login-cookie`,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

export async function logout(): Promise<void> {
  await fetchWithCredentials(`${AUTH_SERVER}/auth/logout-cookie`, {
    method: "POST",
  });
}

export async function getUserInfo(token?: string): Promise<User> {
  const headers: Record<string, string> = {};

  // 如果提供了 token，使用 Bearer Token 认证
  // 否则依赖 Cookie（credentials: "include"）
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return fetchWithCredentials<User>(`${AUTH_SERVER}/auth/me`, {
    headers,
  });
}
