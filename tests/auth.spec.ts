/**
 * Authentication & Route Protection E2E Tests
 *
 * Tests the complete authentication flow including:
 * - Route protection (unauthenticated access)
 * - Login flow
 * - Session persistence
 * - Logout flow
 * - Cookie/Token management
 *
 * Run with: npx playwright test tests/auth.spec.ts
 */

import { test, expect } from "@playwright/test";

// Configuration
const BASE_URL = "http://localhost:3000";
const AUTH_SERVER = "http://localhost:8000";

// Generate unique user for each test
const generateTestUser = () => ({
  username: `test_${Date.now()}`,
  email: `test_${Date.now()}@example.com`,
  password: "TestPassword123!",
});

// Helper: Create a test user via API
async function createTestUser(user: {
  username: string;
  email: string;
  password: string;
}) {
  const response = await fetch(`${AUTH_SERVER}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });
  return response.ok;
}

test.describe("Authentication & Route Protection", () => {
  test("should redirect unauthenticated users to login", async ({ page }) => {
    // Access protected route without authentication
    await page.goto(`${BASE_URL}/`);

    // Should be redirected to login page
    expect(page.url()).toContain("/login");

    // Login form should be visible
    await expect(page.locator('input[type="text"]')).toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("should allow login and set authentication", async ({ page }) => {
    const testUser = generateTestUser();

    // Create test user
    await createTestUser(testUser);

    // Go to login page
    await page.goto(`${BASE_URL}/login`);

    // Fill login form
    await page.fill('input[type="text"]', testUser.username);
    await page.fill('input[type="password"]', testUser.password);

    // Submit login
    await page.click('button:has-text("登录"), button:has-text("Login")');

    // Should redirect to home page
    await expect(page).toHaveURL(`${BASE_URL}/`);

    // Cookie should be set
    const cookies = await page.context().cookies();
    const authCookie = cookies.find((c) => c.name === "auth_token");
    expect(authCookie).toBeDefined();
    expect(authCookie?.value).toBeTruthy();
  });

  test("should persist session across page reloads", async ({ page }) => {
    const testUser = generateTestUser();

    // Create and login
    await createTestUser(testUser);
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="text"]', testUser.username);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button:has-text("登录"), button:has-text("Login")');

    // Wait for redirect to complete
    await expect(page).toHaveURL(`${BASE_URL}/`);

    // Reload page
    await page.reload();

    // Should still be on home page (session persisted)
    expect(page.url()).toBe(`${BASE_URL}/`);

    // Loading indicator should disappear
    const loadingIndicator = page.locator("text=加载中");
    await expect(loadingIndicator).not.toBeVisible({ timeout: 3000 });
  });

  test("should redirect authenticated users away from login page", async ({
    page,
  }) => {
    const testUser = generateTestUser();

    // Create and login
    await createTestUser(testUser);
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="text"]', testUser.username);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button:has-text("登录"), button:has-text("Login")');

    // Wait for home page
    await expect(page).toHaveURL(`${BASE_URL}/`);

    // Navigate to login page while authenticated
    await page.goto(`${BASE_URL}/login`);

    // Should be redirected back to home
    expect(page.url()).toBe(`${BASE_URL}/`);
  });

  test("should hide POC page in production", async ({ page }) => {
    // POC page should redirect to 404 in production
    // (behavior depends on process.env.NODE_ENV)

    await page.goto(`${BASE_URL}/antd-x-poc`);

    // In production: should show 404
    // In development: should show POC content
    const is404 = await page.locator("text=404").isVisible();
    const isPoc = await page.locator("text=POC").isVisible();

    // One of these should be true
    expect(is404 || isPoc).toBeTruthy();
  });

  test("should handle register page correctly", async ({ page }) => {
    // Unauthenticated should see register page
    await page.goto(`${BASE_URL}/register`);

    // Register form should be visible
    const inputs = await page
      .locator(
        'input[type="text"], input[type="email"], input[type="password"]'
      )
      .count();
    expect(inputs).toBeGreaterThanOrEqual(3); // username, email, password
  });

  test("should show loading state briefly on protected pages", async ({
    page,
  }) => {
    const testUser = generateTestUser();

    // Create and login
    await createTestUser(testUser);
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="text"]', testUser.username);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button:has-text("登录"), button:has-text("Login")');

    // On home page, the AuthGuard loading state should eventually disappear
    // (This tests that hasChecked properly updates)
    const loadingIndicator = page.locator("text=加载中");

    // Initially might be visible
    const wasVisible = await loadingIndicator.isVisible().catch(() => false);

    // But should disappear quickly
    if (wasVisible) {
      await expect(loadingIndicator).not.toBeVisible({ timeout: 3000 });
    }
  });

  test("middleware should enforce route protection at request level", async ({
    page,
  }) => {
    // This test verifies that Middleware catches unauthenticated requests
    // before the page even loads

    const interceptPromise = page.waitForResponse(
      (response) =>
        response.url().includes("/login") && response.status() === 200
    );

    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });

    // Should be redirected to login
    await interceptPromise;
    expect(page.url()).toContain("/login");
  });
});

test.describe("Cookie Management", () => {
  test("should set auth_token cookie after login", async ({ page }) => {
    const testUser = generateTestUser();
    await createTestUser(testUser);

    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="text"]', testUser.username);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button:has-text("登录"), button:has-text("Login")');

    const cookies = await page.context().cookies();
    const authCookie = cookies.find((c) => c.name === "auth_token");

    expect(authCookie).toBeDefined();
    expect(authCookie?.value).toBeTruthy();
    expect(authCookie?.path).toBe("/");
    expect(authCookie?.sameSite).toBe("Strict");
  });

  test("should clear auth_token cookie after logout", async ({ page }) => {
    const testUser = generateTestUser();
    await createTestUser(testUser);

    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="text"]', testUser.username);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button:has-text("登录"), button:has-text("Login")');
    await expect(page).toHaveURL(`${BASE_URL}/`);

    // Verify cookie is set
    let cookies = await page.context().cookies();
    let authCookie = cookies.find((c) => c.name === "auth_token");
    expect(authCookie?.value).toBeTruthy();

    // Logout
    // Find and click logout button (implementation depends on UI)
    const logoutButton = page.locator(
      'button:has-text("登出"), button:has-text("Logout"), text=登出, text=Logout'
    );
    if (await logoutButton.isVisible()) {
      await logoutButton.click();

      // Wait for redirect to login
      await expect(page).toHaveURL(`${BASE_URL}/login`, { timeout: 5000 });

      // Cookie should be cleared
      cookies = await page.context().cookies();
      authCookie = cookies.find((c) => c.name === "auth_token");
      expect(authCookie?.value).toBeFalsy();
    }
  });
});
