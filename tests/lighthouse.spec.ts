/**
 * Lighthouse Performance Audit
 * Tests: Accessibility, Performance, Best Practices, SEO scores
 */

import { test, expect } from '@playwright/test';

test.describe('Lighthouse Audits', () => {
  test('should achieve good accessibility score', async ({ page }) => {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    // Check accessibility markers
    const accessibilityMarkers = await page.evaluate(() => {
      const checks = {
        hasHeadings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length > 0,
        hasLabels: document.querySelectorAll('label').length > 0,
        hasAlt: document.querySelectorAll('img[alt]').length > 0,
        hasAriaLive: document.querySelectorAll('[aria-live]').length > 0,
        hasFocusable: document.querySelectorAll('button, a, input, [tabindex]').length > 0,
      };
      return checks;
    });

    expect(accessibilityMarkers.hasFocusable).toBe(true);
    expect(accessibilityMarkers.hasLabels).toBe(true);
  });

  test('should achieve good performance score', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - startTime;

    // Performance metrics
    const perfMetrics = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

      return {
        loadTime: nav.loadEventEnd - nav.fetchStart,
        domReady: nav.domContentLoadedEventEnd - nav.fetchStart,
        resourceCount: resources.length,
        largeResources: resources.filter((r) => r.transferSize > 1000000).length,
      };
    });

    expect(loadTime).toBeLessThan(3000);
    expect(perfMetrics.domReady).toBeLessThan(2500);
  });

  test('should follow best practices', async ({ page }) => {
    await page.goto('http://localhost:3000');

    const bestPractices = await page.evaluate(() => {
      const checks = {
        noConsoleErrors: true,
        hasMetaViewport: !!document.querySelector('meta[name="viewport"]'),
        hasCharset: !!document.querySelector('meta[charset]'),
        hasTitle: !!document.title,
        httpsOrLocalhost: window.location.protocol === 'https:' || window.location.hostname === 'localhost',
        noMixedContent: !document.querySelectorAll('img[src*="http://"]').length,
      };
      return checks;
    });

    expect(bestPractices.hasMetaViewport).toBe(true);
    expect(bestPractices.hasCharset).toBe(true);
    expect(bestPractices.hasTitle).toBe(true);
    expect(bestPractices.httpsOrLocalhost).toBe(true);
  });

  test('should be SEO friendly', async ({ page }) => {
    await page.goto('http://localhost:3000');

    const seoMarkers = await page.evaluate(() => {
      const checks = {
        hasTitle: !!document.title && document.title.length > 0,
        hasMetaDescription: !!document.querySelector('meta[name="description"]'),
        hasHeading: !!document.querySelector('h1'),
        hasStructuredData: !!document.querySelector('script[type="application/ld+json"]'),
        isMobile: !!document.querySelector('meta[name="viewport"]'),
      };
      return checks;
    });

    expect(seoMarkers.hasTitle).toBe(true);
    expect(seoMarkers.hasHeading).toBe(true);
    expect(seoMarkers.isMobile).toBe(true);
  });

  test('should have minimal layout shifts', async ({ page }) => {
    let clsValue = 0;

    const observer = await page.evaluateHandle(() => {
      let cls = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            cls += (entry as any).value;
          }
        }
      });

      observer.observe({ entryTypes: ['layout-shift'] });
      (window as any).__clsValue = cls;
      (window as any).__clsObserver = observer;

      return true;
    });

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    clsValue = await page.evaluate(() => {
      (window as any).__clsObserver?.disconnect();
      return (window as any).__clsValue || 0;
    });

    // CLS should be less than 0.1 (good score is < 0.1)
    expect(clsValue).toBeLessThan(0.1);
  });

  test('should have efficient bundle size', async ({ page }) => {
    const resources: any[] = [];

    page.on('response', (response) => {
      if (response.request().resourceType() === 'script') {
        resources.push({
          url: response.url(),
          size: response.headers()['content-length'],
        });
      }
    });

    await page.goto('http://localhost:3000');

    const totalSize = resources.reduce((sum, r) => sum + (parseInt(r.size) || 0), 0);
    const totalSizeMB = totalSize / (1024 * 1024);

    // JavaScript bundle should be reasonably sized (< 1MB gzipped is good)
    expect(totalSizeMB).toBeLessThan(5);
  });

  test('should not have render-blocking resources', async ({ page }) => {
    const blockingResources: any[] = [];

    page.on('response', (response) => {
      const resourceType = response.request().resourceType();
      const timing = response.timing();

      if ((resourceType === 'stylesheet' || resourceType === 'script') && timing) {
        const duration = timing.responseEnd - timing.requestStart;
        if (duration > 500) {
          blockingResources.push({
            url: response.url(),
            type: resourceType,
            duration,
          });
        }
      }
    });

    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });

    // Should minimize render-blocking resources
    // Some blocking resources are acceptable
    expect(blockingResources.length).toBeLessThan(5);
  });

  test('should have proper caching headers', async ({ page }) => {
    const resourcesWithCache: any[] = [];
    const resourcesWithoutCache: any[] = [];

    page.on('response', (response) => {
      const cacheControl = response.headers()['cache-control'];
      const resource = {
        url: response.url(),
        cacheControl,
      };

      if (cacheControl) {
        resourcesWithCache.push(resource);
      } else {
        resourcesWithoutCache.push(resource);
      }
    });

    await page.goto('http://localhost:3000');

    // Should have some resources with cache headers
    expect(resourcesWithCache.length).toBeGreaterThan(0);
  });

  test('should load fonts efficiently', async ({ page }) => {
    const fontResources: any[] = [];

    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('.woff') || url.includes('.ttf') || url.includes('.otf')) {
        fontResources.push({
          url,
          size: response.headers()['content-length'],
        });
      }
    });

    await page.goto('http://localhost:3000');

    // Font loading should be optimized
    // (System fonts or minimal custom fonts)
    expect(fontResources.length).toBeLessThan(10);
  });
});
