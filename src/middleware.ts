/**
 * Next.js Middleware for Authentication and Route Protection
 *
 * This middleware handles:
 * 1. Route protection - redirects unauthenticated users to login
 * 2. Authenticated user redirect - redirects logged-in users away from login/register
 * 3. Early request interception - zero client-side latency
 *
 * Benefits over client-side AuthGuard:
 * - Request-level interception (<1ms latency)
 * - Server-side auth check (more secure)
 * - No hydration mismatches
 * - Zero page flashing
 *
 * Created: 2026-03-12
 * Architecture Review: ARCHITECTURE_REVIEW_AuthGuard.md
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isJwtExpired } from "@/lib/jwt";

// Routes that require authentication
const PROTECTED_ROUTES = ["/"];

// Routes that are public and redirect to home if authenticated
const PUBLIC_AUTH_ROUTES = ["/login", "/register"];

// Routes that are always public (no auth check)
const ALWAYS_PUBLIC_ROUTES = ["/antd-x-poc", "/demo", "/_not-found"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 演示认证模式：通过环境变量控制
  const isDemoAuthEnabled = process.env.NEXT_PUBLIC_DEMO_AUTH_ENABLED === "true";

  if (isDemoAuthEnabled) {
    return NextResponse.next();
  }

  // Get auth token from cookies (set after login)
  const token = request.cookies.get("access_token")?.value;
  // v1.2: 对 cookie 做 JWT exp 校验，stale cookie 视同未登录
  // 两个分支必须同时用 validToken（而非 !token / token），否则 stale cookie 会触发
  // / ↔ /login 死循环（方案 FRONTEND_AUTH_REDIRECT_GAP_FIX_PLAN.md §14.1）
  const validToken = !!token && !isJwtExpired(token);

  // Check if route requires protection
  const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname === route);
  const isPublicAuthRoute = PUBLIC_AUTH_ROUTES.some(
    (route) => pathname === route
  );
  const isAlwaysPublic = ALWAYS_PUBLIC_ROUTES.some(
    (route) => pathname === route
  );

  // For routes that should always be public
  if (isAlwaysPublic) {
    return NextResponse.next();
  }

  // For protected routes - require valid authentication
  if (isProtectedRoute && !validToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    const response = NextResponse.redirect(loginUrl);
    // 清 stale cookie，避免后续请求重蹈覆辙
    if (token) response.cookies.delete("access_token");
    return response;
  }

  // For public auth routes - redirect to home only if truly authenticated
  if (isPublicAuthRoute && validToken) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Allow request to proceed
  return NextResponse.next();
}

// Configure which routes this middleware applies to
export const config = {
  // Match all routes except static files and images
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
