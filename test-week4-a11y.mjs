/**
 * Phase 0 Week 4 — Lighthouse-equivalent 无障碍审计
 * 使用 axe-core + Playwright 进行 WCAG 2.1 AA 合规性检测
 *
 * 测试内容:
 * 1. Dark 主题下全页面 WCAG AA 审计
 * 2. Light 主题下全页面 WCAG AA 审计
 * 3. SettingsModal (若可打开) WCAG AA 审计
 * 4. 键盘导航和焦点管理
 * 5. 颜色对比度验证
 */

import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const results = [];
let passCount = 0;
let failCount = 0;

function report(name, pass, detail = "") {
  const status = pass ? "✅ PASS" : "❌ FAIL";
  results.push({ name, status, detail });
  if (pass) passCount++;
  else failCount++;
  console.log(`  ${status} ${name}${detail ? " — " + detail : ""}`);
}

function summarizeViolations(violations) {
  if (violations.length === 0) return "0 violations";
  return violations
    .map(
      (v) =>
        `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} element${v.nodes.length > 1 ? "s" : ""})`
    )
    .join("\n    ");
}

(async () => {
  console.log("\n========================================================");
  console.log(" Phase 0 Week 4 — 无障碍审计 (axe-core WCAG 2.1 AA)");
  console.log(" 前端架构师质量团队");
  console.log("========================================================\n");

  const browser = await chromium.launch({ headless: true });

  try {
    // ================================================================
    // TEST 1: Dark Theme — Full Page WCAG AA Audit
    // ================================================================
    console.log("▶ 测试 1: Dark Theme WCAG AA 审计");

    const ctx1 = await browser.newContext({ colorScheme: "dark" });
    const page1 = await ctx1.newPage();
    await page1.goto(BASE_URL, { waitUntil: "load", timeout: 60000 });
    await page1.evaluate(() => {
      localStorage.clear();
    });
    await page1.reload({ waitUntil: "load", timeout: 60000 });
    await page1.waitForTimeout(2000);

    // Close ConfigDialog if present
    const closeBtn1 = page1.locator('button:has-text("Close")');
    if (await closeBtn1.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn1.click();
      await page1.waitForTimeout(500);
    }

    const darkResults = await new AxeBuilder({ page: page1 })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .exclude("#__next > [data-radix-dialog-overlay]") // Exclude hidden dialogs
      .analyze();

    const darkCritical = darkResults.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );
    const darkMinor = darkResults.violations.filter(
      (v) => v.impact === "moderate" || v.impact === "minor"
    );

    report(
      "1.1 Dark: No critical/serious violations",
      darkCritical.length === 0,
      darkCritical.length > 0
        ? `${darkCritical.length} critical/serious:\n    ${summarizeViolations(darkCritical)}`
        : ""
    );
    report(
      "1.2 Dark: Total violations count",
      darkResults.violations.length <= 3,
      `${darkResults.violations.length} total (${darkResults.passes.length} rules passed)`
    );

    if (darkMinor.length > 0) {
      console.log(
        `    ℹ️  ${darkMinor.length} minor/moderate issues:\n    ${summarizeViolations(darkMinor)}`
      );
    }

    await ctx1.close();

    // ================================================================
    // TEST 2: Light Theme — Full Page WCAG AA Audit
    // ================================================================
    console.log("\n▶ 测试 2: Light Theme WCAG AA 审计");

    const ctx2 = await browser.newContext({ colorScheme: "light" });
    const page2 = await ctx2.newPage();
    await page2.goto(BASE_URL, { waitUntil: "load", timeout: 60000 });
    await page2.evaluate(() => {
      localStorage.setItem("pmagent-theme", "light");
      localStorage.setItem(
        "pmagent-settings",
        JSON.stringify({ themePreference: "light", theme: "light" })
      );
    });
    await page2.reload({ waitUntil: "load", timeout: 60000 });
    await page2.waitForTimeout(2000);

    // Close ConfigDialog if present
    const closeBtn2 = page2.locator('button:has-text("Close")');
    if (await closeBtn2.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn2.click();
      await page2.waitForTimeout(500);
    }

    const lightResults = await new AxeBuilder({ page: page2 })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .exclude("#__next > [data-radix-dialog-overlay]")
      .analyze();

    const lightCritical = lightResults.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );
    const lightMinor = lightResults.violations.filter(
      (v) => v.impact === "moderate" || v.impact === "minor"
    );

    report(
      "2.1 Light: No critical/serious violations",
      lightCritical.length === 0,
      lightCritical.length > 0
        ? `${lightCritical.length} critical/serious:\n    ${summarizeViolations(lightCritical)}`
        : ""
    );
    report(
      "2.2 Light: Total violations count",
      lightResults.violations.length <= 3,
      `${lightResults.violations.length} total (${lightResults.passes.length} rules passed)`
    );

    if (lightMinor.length > 0) {
      console.log(
        `    ℹ️  ${lightMinor.length} minor/moderate issues:\n    ${summarizeViolations(lightMinor)}`
      );
    }

    await ctx2.close();

    // ================================================================
    // TEST 3: ConfigDialog WCAG AA Audit (always visible in dev)
    // ================================================================
    console.log("\n▶ 测试 3: ConfigDialog 无障碍审计");

    const ctx3 = await browser.newContext({ colorScheme: "dark" });
    const page3 = await ctx3.newPage();
    await page3.goto(BASE_URL, { waitUntil: "load", timeout: 60000 });
    await page3.evaluate(() => localStorage.clear());
    await page3.reload({ waitUntil: "load", timeout: 60000 });
    await page3.waitForTimeout(2000);

    // ConfigDialog should be visible
    const configDialog = page3.locator('[role="dialog"]');
    const hasConfigDialog = await configDialog.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasConfigDialog) {
      const configResults = await new AxeBuilder({ page: page3 })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .include('[role="dialog"]')
        .analyze();

      const configCritical = configResults.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious"
      );

      report(
        "3.1 ConfigDialog: No critical/serious violations",
        configCritical.length === 0,
        configCritical.length > 0
          ? `${configCritical.length} issues:\n    ${summarizeViolations(configCritical)}`
          : `${configResults.passes.length} rules passed`
      );
    } else {
      report("3.1 ConfigDialog: Not visible (skipped)", true, "No dialog to audit");
    }

    await ctx3.close();

    // ================================================================
    // TEST 4: 键盘导航验证
    // ================================================================
    console.log("\n▶ 测试 4: 键盘导航验证");

    const ctx4 = await browser.newContext({ colorScheme: "dark" });
    const page4 = await ctx4.newPage();
    await page4.goto(BASE_URL, { waitUntil: "load", timeout: 60000 });
    await page4.waitForTimeout(2000);

    // 4.1 Tab key should move focus
    await page4.keyboard.press("Tab");
    const focusedTag1 = await page4.evaluate(() => {
      const el = document.activeElement;
      return el ? el.tagName.toLowerCase() : "none";
    });
    report(
      "4.1 Tab moves focus to interactive element",
      focusedTag1 !== "body" && focusedTag1 !== "none",
      `focused: <${focusedTag1}>`
    );

    // 4.2 Focus should be visible (has outline/ring)
    const hasFocusStyle = await page4.evaluate(() => {
      const el = document.activeElement;
      if (!el) return false;
      const style = getComputedStyle(el);
      const outline = style.outline;
      const boxShadow = style.boxShadow;
      // Check for visible focus indicator
      return (
        (outline && outline !== "none" && !outline.includes("0px")) ||
        (boxShadow && boxShadow !== "none")
      );
    });
    report("4.2 Focus indicator visible on focused element", hasFocusStyle);

    // 4.3 Escape closes dialog
    const dialogBefore = await page4.locator('[role="dialog"]').isVisible().catch(() => false);
    if (dialogBefore) {
      await page4.keyboard.press("Escape");
      await page4.waitForTimeout(500);
      const dialogAfter = await page4.locator('[role="dialog"]').isVisible().catch(() => false);
      report("4.3 Escape closes dialog", !dialogAfter);
    } else {
      report("4.3 Escape closes dialog", true, "No dialog open (skipped)");
    }

    await ctx4.close();

    // ================================================================
    // TEST 5: 颜色对比度专项验证
    // ================================================================
    console.log("\n▶ 测试 5: 颜色对比度验证");

    const ctx5 = await browser.newContext({ colorScheme: "dark" });
    const page5 = await ctx5.newPage();
    await page5.goto(BASE_URL, { waitUntil: "load", timeout: 60000 });
    await page5.waitForTimeout(2000);

    // 5.1 axe color-contrast rule specifically
    const contrastResults = await new AxeBuilder({ page: page5 })
      .withRules(["color-contrast"])
      .analyze();

    report(
      "5.1 Dark: Color contrast passes WCAG AA (4.5:1)",
      contrastResults.violations.length === 0,
      contrastResults.violations.length > 0
        ? `${contrastResults.violations[0].nodes.length} element(s) fail:\n    ${contrastResults.violations[0].nodes.slice(0, 3).map((n) => n.html.substring(0, 80)).join("\n    ")}`
        : `${contrastResults.passes.length} rules passed`
    );

    // 5.2 Light mode contrast
    await page5.evaluate(() => {
      localStorage.setItem("pmagent-theme", "light");
      localStorage.setItem(
        "pmagent-settings",
        JSON.stringify({ themePreference: "light", theme: "light" })
      );
    });
    await page5.reload({ waitUntil: "load", timeout: 60000 });
    await page5.waitForTimeout(2000);

    const lightContrastResults = await new AxeBuilder({ page: page5 })
      .withRules(["color-contrast"])
      .analyze();

    report(
      "5.2 Light: Color contrast passes WCAG AA (4.5:1)",
      lightContrastResults.violations.length === 0,
      lightContrastResults.violations.length > 0
        ? `${lightContrastResults.violations[0].nodes.length} element(s) fail:\n    ${lightContrastResults.violations[0].nodes.slice(0, 3).map((n) => n.html.substring(0, 80)).join("\n    ")}`
        : `${lightContrastResults.passes.length} rules passed`
    );

    await ctx5.close();

    // ================================================================
    // TEST 6: ARIA 属性验证
    // ================================================================
    console.log("\n▶ 测试 6: ARIA 属性验证");

    const ctx6 = await browser.newContext({ colorScheme: "dark" });
    const page6 = await ctx6.newPage();
    await page6.goto(BASE_URL, { waitUntil: "load", timeout: 60000 });
    await page6.waitForTimeout(2000);

    const ariaResults = await new AxeBuilder({ page: page6 })
      .withRules([
        "aria-allowed-attr",
        "aria-hidden-body",
        "aria-required-attr",
        "aria-required-children",
        "aria-required-parent",
        "aria-roles",
        "aria-valid-attr",
        "aria-valid-attr-value",
      ])
      .analyze();

    const ariaViolations = ariaResults.violations;
    report(
      "6.1 ARIA attributes valid",
      ariaViolations.length === 0,
      ariaViolations.length > 0
        ? `${ariaViolations.length} issues:\n    ${summarizeViolations(ariaViolations)}`
        : `${ariaResults.passes.length} ARIA rules passed`
    );

    // 6.2 Check landmark regions
    const landmarkResults = await new AxeBuilder({ page: page6 })
      .withRules(["landmark-one-main", "region"])
      .analyze();

    const landmarkViolations = landmarkResults.violations.filter(
      (v) => v.id === "landmark-one-main"
    );
    report(
      "6.2 Page has main landmark",
      landmarkViolations.length === 0,
      landmarkViolations.length > 0
        ? summarizeViolations(landmarkViolations)
        : ""
    );

    await ctx6.close();

    // ================================================================
    // SUMMARY
    // ================================================================
    console.log("\n========================================================");
    console.log(
      ` 审计结果: ${passCount} PASS / ${failCount} FAIL / ${passCount + failCount} TOTAL`
    );
    console.log("========================================================\n");

    if (failCount > 0) {
      console.log("失败项:");
      for (const r of results) {
        if (r.status.includes("FAIL")) {
          console.log(`  ${r.name}: ${r.detail}`);
        }
      }
      console.log();
    }

    // Score calculation (Lighthouse-style)
    const totalChecks = passCount + failCount;
    const score = Math.round((passCount / totalChecks) * 100);
    console.log(`  Accessibility Score: ${score}/100`);
    console.log();

    process.exit(failCount > 0 ? 1 : 0);
  } catch (err) {
    console.error("\n❌ 审计执行异常:", err.message);
    console.log(`\n  已完成: ${passCount} PASS / ${failCount} FAIL`);
    process.exit(2);
  } finally {
    await browser.close();
  }
})();
