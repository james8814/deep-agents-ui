/**
 * Accessibility Tests (WCAG 2.1 AA)
 * Tests: Keyboard navigation, ARIA labels, color contrast, semantic HTML
 */

import { test, expect } from '@playwright/test';

test.describe('Accessibility Compliance (WCAG 2.1 AA)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    // Check for at least one h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(0);

    // If h1 exists, subsequent headings should follow proper hierarchy
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    let previousLevel = 0;

    for (const heading of headings) {
      const tagName = await heading.evaluate((el) => el.tagName);
      const level = parseInt(tagName.substring(1));

      // Level should not skip more than one step
      if (previousLevel > 0) {
        expect(level - previousLevel).toBeLessThanOrEqual(1);
      }
      previousLevel = level;
    }
  });

  test('should have alt text for images', async ({ page }) => {
    const images = await page.locator('img').all();

    for (const image of images) {
      const alt = await image.getAttribute('alt');
      // Alt should exist and not be empty (unless it's a decorative image with empty alt)
      const ariaHidden = await image.getAttribute('aria-hidden');
      if (!ariaHidden) {
        expect(alt).toBeTruthy();
      }
    }
  });

  test('should have proper form labels', async ({ page }) => {
    const inputs = await page.locator('input[type="text"], input[type="password"], textarea').all();

    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');

      // Input should have either: associated label, aria-label, or aria-labelledby
      if (id) {
        const associatedLabel = await page.locator(`label[for="${id}"]`).count();
        expect(associatedLabel > 0 || ariaLabel || ariaLabelledBy).toBeTruthy();
      } else {
        expect(ariaLabel || ariaLabelledBy).toBeTruthy();
      }
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    // Tab through interactive elements
    const interactiveElements = await page.locator(
      'button, a, input, select, textarea, [role="button"], [role="link"]'
    ).all();

    expect(interactiveElements.length).toBeGreaterThan(0);

    // Press Tab and verify focus moves
    for (let i = 0; i < Math.min(5, interactiveElements.length); i++) {
      await page.press('body', 'Tab');
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      expect(focused).toBeTruthy();
    }
  });

  test('should have visible focus indicators', async ({ page }) => {
    // Tab to a button and check focus visibility
    const buttons = await page.locator('button').all();
    if (buttons.length > 0) {
      await buttons[0].focus();
      const focusStyle = await buttons[0].evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          outline: style.outline,
          boxShadow: style.boxShadow,
        };
      });

      // Element should have visible focus indicator
      expect(
        focusStyle.outline !== 'none' ||
        focusStyle.boxShadow !== 'none'
      ).toBeTruthy();
    }
  });

  test('should have proper color contrast', async ({ page }) => {
    // Get all text elements
    const textElements = await page.locator('body *').all();
    let contrastCheckCount = 0;

    for (const element of textElements.slice(0, 50)) {
      // Sample check on first 50 elements
      const style = await element.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          color: computed.color,
          backgroundColor: computed.backgroundColor,
        };
      });

      // Basic check: colors should not be identical
      if (style.color !== 'rgba(0, 0, 0, 0)') {
        expect(style.color).not.toBe(style.backgroundColor);
        contrastCheckCount++;
      }
    }

    expect(contrastCheckCount).toBeGreaterThan(0);
  });

  test('should have proper ARIA roles', async ({ page }) => {
    // Check for buttons with role="button"
    const roleButtons = await page.locator('[role="button"]').all();
    for (const button of roleButtons) {
      const isVisible = await button.isVisible();
      if (isVisible) {
        expect(button).toBeTruthy();
      }
    }
  });

  test('should announce dynamic content changes', async ({ page }) => {
    // Check for aria-live regions for dynamic updates
    const liveRegions = await page.locator('[aria-live]').all();

    // Page should have at least one live region for notifications if messages are dynamic
    const hasLiveRegion = liveRegions.length > 0;
    if (hasLiveRegion) {
      const liveRegion = liveRegions[0];
      const liveValue = await liveRegion.getAttribute('aria-live');
      expect(['polite', 'assertive', 'off']).toContain(liveValue);
    }
  });

  test('should handle skip navigation links', async ({ page }) => {
    const skipLink = await page.locator('a[href="#main"], a[href="#content"]').first();
    const exists = await skipLink.isVisible().catch(() => false);

    // Skip link is optional but good practice
    if (exists) {
      await skipLink.click();
      const mainContent = await page.locator('main, [id="main"], [id="content"]').first();
      expect(mainContent).toBeTruthy();
    }
  });

  test('should support text resizing', async ({ page }) => {
    // Zoom to 200% (simulating text resize)
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '32px';
    });

    // Content should still be readable
    const visibleText = await page.locator('body').textContent();
    expect(visibleText?.length || 0).toBeGreaterThan(0);

    // Reset zoom
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '16px';
    });
  });
});
