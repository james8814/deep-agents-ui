/**
 * 全局常量
 * 集中管理跨模块共享的常量值，避免重复定义导致的不一致
 */

/** localStorage 中存储 JWT Token 的 key */
export const TOKEN_KEY = "auth_token";

/** localStorage 中存储 Refresh Token 的 key */
export const REFRESH_TOKEN_KEY = "auth_refresh_token";

/** Cookie 中存储 Access Token 的 key (必须与后端一致) */
export const COOKIE_TOKEN_KEY = "access_token";
