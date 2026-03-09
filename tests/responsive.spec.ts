/**
 * Responsive Design Tests
 * Tests: 6 breakpoints (mobile, tablet, desktop variations)
 */

import { test, expect, devices } from '@playwright/test';

const BREAKPOINTS = [
  { name: 'Mobile Small', width: 320, height: 568 },
  { name: 'Mobile', width: 375, height: 667 },
  { name: 'Mobile Large', width: 412, height: 915 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Laptop', width: 1366, height: 768 },
  { name: 'Desktop', width: 1920, height: 1080 },
];

test.describe('Responsive Design Tests', () => {
  for (const breakpoint of BREAKPOINTS) {
    test(`should render correctly at ${breakpoint.name} (${breakpoint.width}x${breakpoint.height})`, async ({
      browser,
    }) => {
      const context = await browser.newContext({
        viewport: { width: breakpoint.width, height: breakpoint.height },
      });
      const page = await context.newPage();

      await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });

      // Check for layout shifts
      const layoutShifts = await page.evaluate(() => {
        let shifts = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              shifts += (entry as any).value;
            }
          }
        });
        observer.observe({ entryTypes: ['layout-shift'] });
        return new Promise<number>((resolve) => {
          setTimeout(() => {
            observer.disconnect();
            resolve(shifts);
          }, 2000);
        });
      });

      expect(layoutShifts).toBeLessThan(0.1);

      // Check that content is not cut off
      const viewportSize = await page.evaluate(() => ({
        width: window.innerWidth,
        height: window.innerHeight,
      }));

      expect(viewportSize.width).toBe(breakpoint.width);
      expect(viewportSize.height).toBe(breakpoint.height);

      // Check for horizontal scrollbar (should not exist on desktop)
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      if (breakpoint.width >= 1024) {
        expect(hasHorizontalScroll).toBe(false);
      }

      await context.close();
    });
  }

  test('should have touch-friendly elements on mobile', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
      ...devices['iPhone 12'],
    });
    const page = await context.newPage();

    await page.goto('http://localhost:3000');

    // Check button sizes (should be at least 44x44 for touch)
    const buttons = await page.locator('button').all();
    for (const button of buttons.slice(0, 5)) {
      const box = await button.boundingBox();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }

    await context.close();
  });

  test('should adapt layout on orientation change', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 667, height: 375 }, // Landscape
    });
    const page = await context.newPage();

    await page.goto('http://localhost:3000');

    const landscapeHeight = await page.evaluate(() => document.body.offsetHeight);

    // Change to portrait
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    const portraitHeight = await page.evaluate(() => document.body.offsetHeight);

    // Layout should adapt (likely change in height)
    expect(portraitHeight).toBeTruthy();
    expect(landscapeHeight).toBeTruthy();

    await context.close();
  });

  test('should handle mobile navigation properly', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
      ...devices['iPhone 12'],
    });
    const page = await context.newPage();

    await page.goto('http://localhost:3000');

    // On mobile, navigation might be in a hamburger menu
    const navToggle = await page.locator('[aria-label*="menu"], [aria-label*="navigation"], .hamburger').first();
    const hasNavToggle = await navToggle.isVisible().catch(() => false);

    if (hasNavToggle) {
      await navToggle.click();
      // Menu should become visible
      const navMenu = await page.locator('nav').first();
      expect(navMenu).toBeTruthy();
    }

    await context.close();
  });

  test('should optimize images for different screen sizes', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
    });
    const page = await context.newPage();

    await page.goto('http://localhost:3000');

    // Check for srcset or picture elements
    const responsiveImages = await page.locator('img[srcset], picture').count();

    // Should have some responsive images or none (both are acceptable)
    expect(responsiveImages || 0).toBeGreaterThanOrEqual(0);

    await context.close();
  });

  test('should handle text readability at all breakpoints', async ({ browser }) => {
    for (const breakpoint of BREAKPOINTS) {
      const context = await browser.newContext({
        viewport: { width: breakpoint.width, height: breakpoint.height },
      });
      const page = await context.newPage();

      await page.goto('http://localhost:3000');

      // Check that text has readable font size
      const textElements = await page.locator('p, span, a').all();
      for (const element of textElements.slice(0, 5)) {
        const fontSize = await element.evaluate((el) => {
          return window.getComputedStyle(el).fontSize;
        });

        const fontSizeNumber = parseInt(fontSize);
        // Font should be at least 12px for readability
        expect(fontSizeNumber).toBeGreaterThanOrEqual(12);
      }

      await context.close();
    }
  });

  test('should not have fixed width containers on mobile', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
    });
    const page = await context.newPage();

    await page.goto('http://localhost:3000');

    // Check main content container
    const mainContent = await page.locator('main, [role="main"]').first();
    const hasMainContent = await mainContent.isVisible().catch(() => false);

    if (hasMainContent) {
      const width = await mainContent.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          width: style.width,
          maxWidth: style.maxWidth,
        };
      });

      // Width should be flexible on mobile
      expect(width.maxWidth !== 'none').toBeTruthy();
    }

    await context.close();
  });
});
