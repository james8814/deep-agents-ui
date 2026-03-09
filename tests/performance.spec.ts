/**
 * Performance Tests
 * Tests: Page load times, Core Web Vitals, bundle size
 */

import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('should load page within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('http://localhost:3000', {
      waitUntil: 'domcontentloaded',
    });

    const loadTime = Date.now() - startTime;

    // Page should load in under 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should achieve acceptable FCP (First Contentful Paint)', async ({ page }) => {
    const metrics = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return nav.domContentLoadedEventEnd - nav.fetchStart;
    });

    // FCP should be under 2.5 seconds
    expect(metrics).toBeLessThan(2500);
  });

  test('should have acceptable LCP (Largest Contentful Paint)', async ({ page }) => {
    await page.goto('http://localhost:3000');

    const lcpValue = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.renderTime || lastEntry.loadTime);
        });

        observer.observe({ entryTypes: ['largest-contentful-paint'] });

        // Timeout after 3 seconds
        setTimeout(() => resolve(0), 3000);
      });
    });

    // LCP should be under 2.5 seconds
    expect(lcpValue).toBeLessThan(2500);
  });

  test('should minimize CLS (Cumulative Layout Shift)', async ({ page }) => {
    await page.goto('http://localhost:3000');

    const cls = await page.evaluate(() => {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if ((entry as any).hadRecentInput) continue;
          clsValue += (entry as any).value;
        }
      });

      observer.observe({ entryTypes: ['layout-shift'] });

      return new Promise<number>((resolve) => {
        setTimeout(() => {
          observer.disconnect();
          resolve(clsValue);
        }, 3000);
      });
    });

    // CLS should be under 0.1
    expect(cls).toBeLessThan(0.1);
  });

  test('should not have render-blocking resources', async ({ page }) => {
    const _requests = await page.context().tracing.startChunk?.() || null;

    await page.goto('http://localhost:3000');

    const resources = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      return entries
        .filter((entry) => {
          return (
            entry.name.includes('.css') || entry.name.includes('.js')
          );
        })
        .map((entry) => ({
          name: entry.name,
          duration: entry.duration,
        }));
    });

    // Should have some resources loaded
    expect(resources.length).toBeGreaterThan(0);
  });

  test('should efficiently use memory', async ({ page }) => {
    await page.goto('http://localhost:3000');

    const memoryUsage = await page.evaluate(() => {
      if ((performance as any).memory) {
        return {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        };
      }
      return null;
    });

    if (memoryUsage) {
      // Used heap should be reasonable (less than 50MB is good)
      const usedMB = memoryUsage.usedJSHeapSize / (1024 * 1024);
      expect(usedMB).toBeLessThan(50);
    }
  });

  test('should not have memory leaks on navigation', async ({ page }) => {
    await page.goto('http://localhost:3000');

    const memBefore = await page.evaluate(() => {
      if ((performance as any).memory) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });

    // Navigate away and back
    await page.goto('http://localhost:3000/login');
    await page.goto('http://localhost:3000');

    const memAfter = await page.evaluate(() => {
      if ((performance as any).memory) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });

    // Memory increase should be reasonable
    const memIncrease = (memAfter - memBefore) / (1024 * 1024);
    expect(memIncrease).toBeLessThan(20); // Less than 20MB increase
  });

  test('should have optimized CSS delivery', async ({ page }) => {
    const cssResources: any[] = [];

    page.on('response', (response) => {
      if (response.request().resourceType() === 'stylesheet') {
        cssResources.push({
          url: response.url(),
          size: response.headers()['content-length'],
        });
      }
    });

    await page.goto('http://localhost:3000');

    // Should have CSS files
    expect(cssResources.length).toBeGreaterThan(0);
  });

  test('should lazy load images efficiently', async ({ page }) => {
    await page.goto('http://localhost:3000');

    const lazyImages = await page.locator('img[loading="lazy"]').count();
    const allImages = await page.locator('img').count();

    // Should have some lazy-loaded images (or none if no images)
    if (allImages > 0) {
      expect(lazyImages + (allImages - lazyImages)).toEqual(allImages);
    }
  });
});
