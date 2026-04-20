/**
 * JWT 工具（Edge Runtime 兼容）
 * 注意：仅做结构解析 + exp 检查，不做签名验证
 * 签名验证由后端承担
 */
export function isJwtExpired(token: string, bufferMs = 30_000): boolean {
  try {
    const [, payload] = token.split(".");
    if (!payload) return true;
    const raw = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = raw.padEnd(raw.length + ((4 - (raw.length % 4)) % 4), "=");
    const claims = JSON.parse(atob(padded));
    if (typeof claims.exp !== "number") return false;
    return Date.now() >= claims.exp * 1000 - bufferMs;
  } catch {
    return true;
  }
}
