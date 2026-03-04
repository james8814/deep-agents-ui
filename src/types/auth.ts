/**
 * 认证相关类型定义
 */

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // 秒，通常 1800 (30分钟)
  user_id: string;
  username: string;
  refresh_token?: string; // 后端可能返回 refresh_token
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  is_active?: boolean;
}

export interface ApiError {
  detail: string;
}

export interface RefreshResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}
