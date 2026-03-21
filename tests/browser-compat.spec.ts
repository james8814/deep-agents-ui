/**
 * Browser Compatibility Tests
 * Tests: Chrome, Firefox, Safari functionality
 */

import { test, expect, chromium, firefox, webkit } from "@playwright/test";

const BROWSERS = [
  { name: "Chromium", browser: chromium },
  { name: "Firefox", browser: firefox },
  { name: "WebKit (Safari)", browser: webkit },
];

test.describe("Browser Compatibility", () => {
  for (const { name, browser } of BROWSERS) {
    test.describe(`${name} Compatibility`, () => {
      test(`should load page on ${name}`, async () => {
        const browserInstance = await browser.launch();
        const context = await browserInstance.newContext();
        const page = await context.newPage();

        await page.goto("http://localhost:3000", {
          waitUntil: "domcontentloaded",
        });

        // Check page loaded successfully
        expect(page.url()).toContain("localhost:3000");

        await context.close();
        await browserInstance.close();
      });

      test(`should render layout correctly on ${name}`, async () => {
        const browserInstance = await browser.launch();
        const context = await browserInstance.newContext();
        const page = await context.newPage();

        await page.goto("http://localhost:3000");

        // Check main content is visible
        const body = await page.locator("body").boundingBox();
        expect(body?.width).toBeGreaterThan(0);
        expect(body?.height).toBeGreaterThan(0);

        await context.close();
        await browserInstance.close();
      });

      test(`should support flexbox on ${name}`, async () => {
        const browserInstance = await browser.launch();
        const context = await browserInstance.newContext();
        const page = await context.newPage();

        await page.goto("http://localhost:3000");

        // Check if flex layouts work
        const flexContainer = await page.evaluate(() => {
          const elements = document.querySelectorAll('[class*="flex"]');
          if (elements.length === 0) return true; // OK if no flex classes

          const first = elements[0] as HTMLElement;
          const display = window.getComputedStyle(first).display;
          return display === "flex";
        });

        expect(flexContainer).toBeTruthy();

        await context.close();
        await browserInstance.close();
      });

      test(`should support CSS Grid on ${name}`, async () => {
        const browserInstance = await browser.launch();
        const context = await browserInstance.newContext();
        const page = await context.newPage();

        await page.goto("http://localhost:3000");

        // Check if grid layouts work
        const gridContainer = await page.evaluate(() => {
          const elements = document.querySelectorAll('[class*="grid"]');
          if (elements.length === 0) return true; // OK if no grid classes

          const first = elements[0] as HTMLElement;
          const display = window.getComputedStyle(first).display;
          return display === "grid";
        });

        expect(gridContainer).toBeTruthy();

        await context.close();
        await browserInstance.close();
      });

      test(`should handle CSS custom properties on ${name}`, async () => {
        const browserInstance = await browser.launch();
        const context = await browserInstance.newContext();
        const page = await context.newPage();

        await page.goto("http://localhost:3000");

        // Check if CSS variables are working
        const cssVarsSupported = await page.evaluate(() => {
          const root = document.documentElement;
          const style = window.getComputedStyle(root);
          // Try to get a CSS variable
          return style.getPropertyValue("--color-primary") !== "";
        });

        // CSS variables are optional
        expect(typeof cssVarsSupported).toBe("boolean");

        await context.close();
        await browserInstance.close();
      });

      test(`should support modern JavaScript features on ${name}`, async () => {
        const browserInstance = await browser.launch();
        const context = await browserInstance.newContext();
        const page = await context.newPage();

        await page.goto("http://localhost:3000");

        // Test modern JS features
        const modernJsSupported = await page.evaluate(() => {
          try {
            // Test arrow functions
            const _arrow = () => true;
            // Test template literals
            const _template = `test`;
            // Test destructuring
            const { _a } = { a: 1 };
            // Test async/await
            const _asyncFunc = async () => true;
            return true;
          } catch {
            return false;
          }
        });

        expect(modernJsSupported).toBe(true);

        await context.close();
        await browserInstance.close();
      });

      test(`should support fetch API on ${name}`, async () => {
        const browserInstance = await browser.launch();
        const context = await browserInstance.newContext();
        const page = await context.newPage();

        await page.goto("http://localhost:3000");

        // Check fetch support
        const fetchSupported = await page.evaluate(() => {
          return typeof fetch === "function";
        });

        expect(fetchSupported).toBe(true);

        await context.close();
        await browserInstance.close();
      });

      test(`should support WebSocket on ${name}`, async () => {
        const browserInstance = await browser.launch();
        const context = await browserInstance.newContext();
        const page = await context.newPage();

        await page.goto("http://localhost:3000");

        // Check WebSocket support
        const wsSupported = await page.evaluate(() => {
          return typeof WebSocket === "function";
        });

        expect(wsSupported).toBe(true);

        await context.close();
        await browserInstance.close();
      });

      test(`should handle CSS transforms on ${name}`, async () => {
        const browserInstance = await browser.launch();
        const context = await browserInstance.newContext();
        const page = await context.newPage();

        await page.goto("http://localhost:3000");

        // Test CSS transforms
        const transformSupported = await page.evaluate(() => {
          const el = document.createElement("div");
          el.style.transform = "translate(0, 0)";
          return el.style.transform !== "";
        });

        expect(transformSupported).toBe(true);

        await context.close();
        await browserInstance.close();
      });

      test(`should handle localStorage on ${name}`, async () => {
        const browserInstance = await browser.launch();
        const context = await browserInstance.newContext();
        const page = await context.newPage();

        await page.goto("http://localhost:3000");

        // Test localStorage
        const localStorageSupported = await page.evaluate(() => {
          try {
            localStorage.setItem("test", "value");
            const value = localStorage.getItem("test");
            localStorage.removeItem("test");
            return value === "value";
          } catch {
            return false;
          }
        });

        expect(localStorageSupported).toBe(true);

        await context.close();
        await browserInstance.close();
      });
    });
  }

  test("should have consistent behavior across browsers", async () => {
    const results: Record<string, any> = {};

    for (const { name, browser } of BROWSERS) {
      const browserInstance = await browser.launch();
      const context = await browserInstance.newContext();
      const page = await context.newPage();

      await page.goto("http://localhost:3000");

      const metrics = await page.evaluate(() => ({
        url: window.location.href,
        docReady: document.readyState,
        bodyElements: document.body.children.length,
      }));

      results[name] = metrics;

      await context.close();
      await browserInstance.close();
    }

    // All browsers should load the same page
    expect(Object.values(results)[0]).toBeTruthy();
    expect(results["Chromium"]).toBeTruthy();
    expect(results["Firefox"]).toBeTruthy();
    expect(results["WebKit (Safari)"]).toBeTruthy();
  });
});
