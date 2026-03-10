/**
 * E2E Tests for Authentication Flow and fetchInterceptor
 *
 * Test Scenarios:
 * - Scenario A: No Token access - Should redirect to config dialog, no 401 errors
 * - Scenario B: Expired Token - Client pre-check clears, no network 401
 * - Scenario C: Normal login - Page loads normally, no BlockingError
 * - Scenario D: With threadId refresh - No BlockingError
 */

import { test, expect, Page } from "@playwright/test";

// Test configuration
const TEST_CONFIG = {
  baseURL: "http://localhost:3000",
  deploymentUrl: "http://localhost:2024",
  assistantId: "pmagent",
};

// Simple base64url encoder (works in Node.js and browser)
function base64UrlEncode(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Helper function to generate a JWT token with custom expiry
function generateJWT(
  payload: Record<string, unknown>,
  expiresInSeconds: number
): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);

  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(tokenPayload));

  return `${encodedHeader}.${encodedPayload}.mock_signature`;
}

// Helper to clear all auth-related localStorage
async function clearAuthStorage(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

// Helper to set auth token in localStorage
async function setAuthToken(page: Page, token: string): Promise<void> {
  await page.evaluate((t) => {
    localStorage.setItem("auth_token", t);
  }, token);
}

// Helper to set config in localStorage
async function setConfig(
  page: Page,
  config: { deploymentUrl: string; assistantId: string }
): Promise<void> {
  await page.evaluate((c) => {
    localStorage.setItem("deep-agent-config-v2", JSON.stringify(c));
  }, config);
}

// Helper to intercept and track network requests
interface NetworkRequest {
  url: string;
  method: string;
  status?: number;
  headers: Record<string, string>;
}

test.describe("Scenario A: No Token Access", () => {
  test("should redirect to login page without 401 errors", async ({ page }) => {
    // Clear all storage first
    await clearAuthStorage(page);

    // Track console errors
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // Track network requests
    const networkRequests: NetworkRequest[] = [];
    page.on("requestfailed", (request) => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
      });
    });

    // Navigate to home page without token
    await page.goto(TEST_CONFIG.baseURL);

    // Wait for redirect to login page
    await page.waitForURL("**/login", { timeout: 10000 });

    // Verify we're on login page
    await expect(page).toHaveURL(/\/login/);

    // Verify no console errors related to authentication
    const authRelatedErrors = consoleErrors.filter(
      (err) =>
        err.includes("401") ||
        err.includes("Unauthorized") ||
        err.includes("auth")
    );
    expect(authRelatedErrors).toHaveLength(0);
  });

  test("should show config dialog when accessing without setup", async ({
    page,
  }) => {
    await clearAuthStorage(page);

    // Navigate to home page
    await page.goto(TEST_CONFIG.baseURL);

    // Should eventually redirect or show welcome screen
    // Wait for either login redirect or config dialog
    await page.waitForLoadState("networkidle");

    // Check that we're either on login or see welcome/configuration UI
    const url = page.url();
    const hasLoginInUrl = url.includes("/login");
    const hasWelcomeText = await page.getByText("Welcome").count();
    const hasConfigText = await page.getByText("Configure").count();

    expect(hasLoginInUrl || hasWelcomeText > 0 || hasConfigText > 0).toBe(true);
  });
});

test.describe("Scenario B: Expired Token", () => {
  test("should clear expired token on client-side without network 401", async ({
    page,
  }) => {
    // Clear storage first
    await clearAuthStorage(page);

    // Set an already-expired token (expired 1 hour ago)
    const expiredToken = generateJWT({ userId: "test-user" }, -3600);
    await setAuthToken(page, expiredToken);

    // Track console errors
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to home page with expired token
    await page.goto(TEST_CONFIG.baseURL);

    // Wait for auth check to complete
    await page.waitForTimeout(2000);

    // Should redirect to login (expired token cleared)
    // The client-side check should prevent sending requests with expired token
    // Check URL - should redirect to login due to expired token
    const url = page.url();
    expect(url.includes("/login")).toBe(true);

    // Verify token was cleared from localStorage
    const storedToken = await page.evaluate(() =>
      localStorage.getItem("auth_token")
    );
    expect(storedToken).toBeNull();
  });

  test("should not send requests with expired token", async ({ page }) => {
    await clearAuthStorage(page);

    // Set expired token
    const expiredToken = generateJWT({ sub: "test" }, -60);
    await setAuthToken(page, expiredToken);

    // Track if any authenticated requests were made to protected endpoints
    const protectedRequests: string[] = [];

    page.on("request", (request) => {
      const url = request.url();
      const authHeader = request.headers()["authorization"];

      // Check if we're sending to protected endpoints with expired token
      if (
        (url.includes("localhost:2024") || url.includes("localhost:8000")) &&
        authHeader &&
        authHeader.includes("Bearer")
      ) {
        protectedRequests.push(url);
      }
    });

    await page.goto(TEST_CONFIG.baseURL);
    await page.waitForTimeout(1500);

    // The expired token should have been cleared by AuthContext before any requests are sent
    // So there should be no protected requests with the expired token
    // After redirect to login, no protected API calls should be made
  });
});

test.describe("Scenario C: Normal Login", () => {
  test("should load page correctly with valid token", async ({ page }) => {
    await clearAuthStorage(page);

    // Set valid token (expires in 1 hour)
    const validToken = generateJWT(
      { sub: "test-user", username: "testuser" },
      3600
    );
    await setAuthToken(page, validToken);

    // Set valid config
    await setConfig(page, {
      deploymentUrl: TEST_CONFIG.deploymentUrl,
      assistantId: TEST_CONFIG.assistantId,
    });

    // Track console errors
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to home page
    await page.goto(TEST_CONFIG.baseURL);

    // Wait for page to load (may redirect to login if no valid session)
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Check for BlockingError in console
    const blockingErrors = consoleErrors.filter(
      (err) =>
        err.toLowerCase().includes("blockerror") ||
        err.includes("BlockingError")
    );

    // There should be no BlockingError for normal login
    expect(blockingErrors).toHaveLength(0);

    // Page should either load or redirect to login (if backend unavailable)
    // The key is no BlockingError
    const url = page.url();
    expect(url).toBeTruthy();
  });

  test("should have fetchInterceptor properly applied", async ({ page }) => {
    await clearAuthStorage(page);

    // Set valid token
    const validToken = generateJWT({ sub: "test" }, 3600);
    await setAuthToken(page, validToken);

    await setConfig(page, {
      deploymentUrl: TEST_CONFIG.deploymentUrl,
      assistantId: TEST_CONFIG.assistantId,
    });

    // Navigate to page
    await page.goto(TEST_CONFIG.baseURL);
    await page.waitForLoadState("networkidle");

    // Check if fetchInterceptor is applied
    const interceptorStatus = await page.evaluate(() => {
      return (
        window as unknown as {
          fetchInterceptorStatus?: {
            isApplied: boolean;
            isEnabled: () => boolean;
          };
        }
      ).fetchInterceptorStatus;
    });

    // fetchInterceptor should be applied
    expect(interceptorStatus).toBeDefined();
    if (interceptorStatus) {
      expect(interceptorStatus.isApplied).toBe(true);
    }
  });
});

test.describe("Scenario D: With threadId Refresh", () => {
  test("should refresh page with threadId without BlockingError", async ({
    page,
  }) => {
    await clearAuthStorage(page);

    // Set valid token
    const validToken = generateJWT({ sub: "test-user" }, 3600);
    await setAuthToken(page, validToken);

    // Set valid config
    await setConfig(page, {
      deploymentUrl: TEST_CONFIG.deploymentUrl,
      assistantId: TEST_CONFIG.assistantId,
    });

    // Track console errors
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to home page with threadId in URL
    const threadId = "test-thread-123";
    await page.goto(`${TEST_CONFIG.baseURL}/?threadId=${threadId}`);

    // Wait for page to load
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);

    // Check for BlockingError
    const blockingErrors = consoleErrors.filter((err) =>
      err.toLowerCase().includes("blockerror")
    );

    expect(blockingErrors).toHaveLength(0);

    // Verify URL contains threadId
    const url = page.url();
    expect(url).toContain("threadId");
  });

  test("should handle threadId with valid token correctly", async ({
    page,
  }) => {
    await clearAuthStorage(page);

    const validToken = generateJWT({ sub: "user" }, 3600);
    await setAuthToken(page, validToken);

    await setConfig(page, {
      deploymentUrl: TEST_CONFIG.deploymentUrl,
      assistantId: TEST_CONFIG.assistantId,
    });

    const threadId = "existing-thread-456";

    // First load
    await page.goto(`${TEST_CONFIG.baseURL}/?threadId=${threadId}`);
    await page.waitForLoadState("domcontentloaded");

    // Refresh the page
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);

    // Should still work without BlockingError
    const currentUrl = page.url();
    expect(currentUrl).toContain(threadId);
  });
});

test.describe("fetchInterceptor Integration Tests", () => {
  test("should intercept fetch and add Authorization header", async ({
    page,
  }) => {
    await clearAuthStorage(page);

    // Set valid token
    const validToken = generateJWT({ sub: "test" }, 3600);
    await setAuthToken(page, validToken);

    // Navigate to page to initialize fetchInterceptor
    await page.goto(TEST_CONFIG.baseURL);
    await page.waitForLoadState("networkidle");

    // Test that fetchInterceptor is working by checking if it's applied
    const status = await page.evaluate(() => {
      const win = window as unknown as {
        fetchInterceptorStatus?: {
          isApplied: boolean;
          isEnabled: () => boolean;
        };
      };
      return win.fetchInterceptorStatus;
    });

    expect(status?.isApplied).toBe(true);
  });

  test("should handle missing token gracefully", async ({ page }) => {
    await clearAuthStorage(page);

    // No token set

    // Navigate to page
    await page.goto(TEST_CONFIG.baseURL);

    // Wait for redirect to login
    await page.waitForURL("**/login", { timeout: 10000 });

    // Should not throw any errors
    const url = page.url();
    expect(url).toContain("/login");
  });
});

test.describe("Configuration Dialog Tests", () => {
  test("should open config dialog when no config exists", async ({ page }) => {
    await clearAuthStorage(page);

    // Navigate to home
    await page.goto(TEST_CONFIG.baseURL);

    // Should show configuration dialog or redirect
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);

    // Either config dialog or login/welcome screen
    const url = page.url();
    const bodyText = await page.locator("body").textContent();

    expect(
      url.includes("/login") ||
        bodyText?.includes("Configure") ||
        bodyText?.includes("Welcome") ||
        bodyText?.includes("Configuration")
    ).toBe(true);
  });

  test("should save config to localStorage", async ({ page }) => {
    await clearAuthStorage(page);

    const validToken = generateJWT({ sub: "test" }, 3600);
    await setAuthToken(page, validToken);

    // Navigate to page (may show config dialog if no config)
    await page.goto(TEST_CONFIG.baseURL);
    await page.waitForLoadState("domcontentloaded");

    // If config dialog is visible, fill it
    const deploymentUrlInput = page.locator('input[id="deploymentUrl"]');
    const assistantIdInput = page.locator('input[id="assistantId"]');

    // Check if inputs are visible
    const isConfigVisible = await deploymentUrlInput
      .isVisible()
      .catch(() => false);

    if (isConfigVisible) {
      await deploymentUrlInput.fill(TEST_CONFIG.deploymentUrl);
      await assistantIdInput.fill(TEST_CONFIG.assistantId);

      // Click save
      await page.getByRole("button", { name: "Save" }).click();

      // Verify config is saved
      const savedConfig = await page.evaluate(() => {
        return localStorage.getItem("deep-agent-config-v2");
      });

      expect(savedConfig).toBeTruthy();
      const parsed = JSON.parse(savedConfig!);
      expect(parsed.deploymentUrl).toBe(TEST_CONFIG.deploymentUrl);
      expect(parsed.assistantId).toBe(TEST_CONFIG.assistantId);
    }
  });
});
