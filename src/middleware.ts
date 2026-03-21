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

// Routes that require authentication
const PROTECTED_ROUTES = ["/"];

// Routes that are public and redirect to home if authenticated
const PUBLIC_AUTH_ROUTES = ["/login", "/register"];

// Routes that are always public (no auth check)
const ALWAYS_PUBLIC_ROUTES = ["/antd-x-poc", "/demo", "/_not-found"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 演示认证模式：如果启用，绕过中间件认证检查
  // Demo Authentication: If enabled, bypass middleware auth check
  const isDemoAuthEnabled =
    process.env.NEXT_PUBLIC_DEMO_AUTH_ENABLED === "true";

  if (isDemoAuthEnabled) {
    // In demo mode, allow all routes without middleware checks
    // 在演示模式下，绕过所有中间件认证检查
    return NextResponse.next();
  }

  // Get auth token from cookies (set after login)
  // Note: In this system, token is stored in localStorage (client-side)
  // For full middleware protection, token should also be set as HttpOnly cookie
  const token = request.cookies.get("auth_token")?.value;

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

  // For protected routes - require authentication
  if (isProtectedRoute && !token) {
    // Redirect to login if not authenticated
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // For public auth routes - redirect to home if already authenticated
  if (isPublicAuthRoute && token) {
    // User is already logged in, redirect to home
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
