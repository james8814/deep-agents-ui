/**
 * P0 Auth Redirect Gap Fix — Route Protection E2E
 *
 * 对应方案: docs/bug_fixes/FRONTEND_AUTH_REDIRECT_GAP_FIX_PLAN.md (v1.2)
 *
 * 专测 P0-1 middleware 层的 JWT exp 下沉 + 双分支 validToken 对称,
 * 不依赖真实后端登录流程,通过直接注入 cookie 的结构化 JWT 验证路由行为。
 *
 * 覆盖断链 #2(存在性检查)+ #9(PUBLIC_AUTH_ROUTES 反向循环)。
 */
import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3100";

/** 生成结构合法的 JWT（不验签，仅 base64url header.payload.sig 结构） */
function makeJwt(claims: Record<string, unknown>): string {
  const b64url = (s: string) =>
    Buffer.from(s)
      .toString("base64")
      .replace(/=+$/, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify(claims));
  return `${header}.${payload}.sig_placeholder`;
}

const expiredJwt = makeJwt({
  sub: "u",
  exp: Math.floor(Date.now() / 1000) - 3600, // 1 小时前过期
});

const validJwt = makeJwt({
  sub: "u",
  exp: Math.floor(Date.now() / 1000) + 3600, // 1 小时后过期
});

test.describe("P0 Middleware Route Protection (方案 v1.2)", () => {
  test.beforeEach(async ({ context }) => {
    // 每个 case 前确保干净
    await context.clearCookies();
  });

  test("场景 1: 全清 cookie + localStorage,访问 / → 跳 /login", async ({
    page,
  }) => {
    const response = await page.goto(`${BASE}/`, { waitUntil: "commit" });
    // middleware 应立刻重定向到 /login
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
    // 断言带上 from 参数
    expect(page.url()).toContain("from=");
    // 跳转响应链里第一跳应该是 307/308
    expect(response?.status()).toBeLessThan(400);
  });

  test("场景 2(关键): 过期 JWT cookie,访问 / → 跳 /login 且顺手清 cookie", async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: "access_token",
        value: expiredJwt,
        domain: "localhost",
        path: "/",
      },
    ]);

    await page.goto(`${BASE}/`, { waitUntil: "commit" });
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");

    // middleware 的 response.cookies.delete 应该把 stale cookie 清掉
    const cookies = await context.cookies(BASE);
    const stillThere = cookies.find((c) => c.name === "access_token");
    // 过期 cookie 被清(Max-Age=0 或已不在)
    expect(stillThere?.value || "").toBe("");
  });

  test("场景 3(关键,防循环): 过期 JWT cookie,访问 /login → 保留在 /login,不被弹回 /", async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: "access_token",
        value: expiredJwt,
        domain: "localhost",
        path: "/",
      },
    ]);

    await page.goto(`${BASE}/login`, { waitUntil: "commit" });
    // 等待可能的重定向稳定
    await page.waitForLoadState("domcontentloaded");

    // 关键断言: URL 保留在 /login,不因 isPublicAuthRoute && token 被反弹到 /
    // 如果 v1.2 修复不到位,这里会进入 / → /login → / 无限循环
    expect(page.url()).toContain("/login");
    expect(page.url()).not.toMatch(/\/$/); // 不在 / 根路径
  });

  test("场景 4: 合法 JWT cookie,访问 /login → 跳 /", async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: "access_token",
        value: validJwt,
        domain: "localhost",
        path: "/",
      },
    ]);

    await page.goto(`${BASE}/login`, { waitUntil: "commit" });
    await page.waitForURL(new RegExp(`${BASE}/?($|\\?)`));
    // 不应停留在 /login
    expect(page.url()).not.toContain("/login");
  });
});

test.describe("P0 AuthGuard Client Fallback(无 valid 后端模拟)", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("场景 5(关键): 过期 cookie + 空 localStorage 点击主页,最终稳定在 /login(不循环)", async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: "access_token",
        value: expiredJwt,
        domain: "localhost",
        path: "/",
      },
    ]);

    // 收集 URL 变化历史,验证没有无限循环
    const urlHistory: string[] = [];
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) urlHistory.push(frame.url());
    });

    await page.goto(`${BASE}/`);
    // 等 3 秒,足够任何可能的循环显现
    await page.waitForTimeout(3000);

    // 最终稳定在 /login
    expect(page.url()).toContain("/login");

    // 循环检测: URL 历史里 / 和 /login 的切换不应超过 4 次
    const switches = urlHistory.filter(
      (u, i) => i > 0 && u.split("?")[0] !== urlHistory[i - 1].split("?")[0]
    );
    expect(switches.length).toBeLessThan(4);
  });
});
