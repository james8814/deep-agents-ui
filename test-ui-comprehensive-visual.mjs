/**
 * UI 改版全面视觉走查测试
 * 逐项核查所有已完成工作
 */

import { chromium } from "playwright";
import fs from "fs";

const BASE_URL = "http://localhost:3000";
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

(async () => {
  console.log("\n" + "=".repeat(70));
  console.log(" UI 改版全面视觉走查测试");
  console.log("=".repeat(70));
  console.log(` 测试时间: ${new Date().toISOString()}`);
  console.log(` 测试 URL: ${BASE_URL}`);
  console.log("=".repeat(70));

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // ========================================================================
  // 测试组 1: 设计系统 - CSS 变量
  // ========================================================================
  console.log("\n▶ 测试组 1: 设计系统 - CSS 变量");

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    colorScheme: "dark",
    locale: "zh-CN"
  });

  await context.addInitScript(() => {
    localStorage.setItem("deep-agent-config-v2", JSON.stringify({
      deploymentUrl: "http://localhost:2024",
      assistantId: "pmagent"
    }));
  });

  const page = await context.newPage();
  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);

  // CSS 变量检查
  const cssVars = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      cyan: style.getPropertyValue("--color-cyan")?.trim(),
      primary: style.getPropertyValue("--color-primary")?.trim(),
      background: style.getPropertyValue("--color-background")?.trim(),
    };
  });

  report("CSS 变量 --color-cyan", cssVars.cyan?.toLowerCase() === "#38bdf8", cssVars.cyan);
  report("CSS 变量 --color-primary (dark)", cssVars.primary === "#7c6bf0", cssVars.primary);

  // ========================================================================
  // 测试组 2: Logo 集成
  // ========================================================================
  console.log("\n▶ 测试组 2: Logo 集成");

  const logoExists = await page.locator('header svg[role="img"]').count() > 0;
  report("Header AZUNE Wordmark 存在", logoExists);

  const logoHasAriaLabel = await page.locator('header svg[aria-label="AZUNE"]').count() > 0;
  report("Header Wordmark 有 ARIA 标签", logoHasAriaLabel);

  // 截图记录
  await page.screenshot({ path: "test-visual-logo-dark.png", fullPage: false });
  console.log("  📸 Logo Dark mode: test-visual-logo-dark.png");

  // ========================================================================
  // 测试组 3: 主题切换
  // ========================================================================
  console.log("\n▶ 测试组 3: 主题切换");

  // 获取 dark mode 背景色
  const darkBg = await page.evaluate(() => {
    return getComputedStyle(document.body).backgroundColor;
  });

  // 点击主题切换按钮
  const themeButton = await page.locator('button[aria-label*="Switch to"]').first();
  if (await themeButton.isVisible().catch(() => false)) {
    await themeButton.click();
    await page.waitForTimeout(1000);

    // 获取 light mode 背景色
    const lightBg = await page.evaluate(() => {
      return getComputedStyle(document.body).backgroundColor;
    });

    report("主题切换功能", darkBg !== lightBg, `${darkBg} → ${lightBg}`);

    // 截图记录
    await page.screenshot({ path: "test-visual-theme-light.png", fullPage: false });
    console.log("  📸 Theme Light: test-visual-theme-light.png");

    // 检查 Logo 在 light mode 下仍然存在
    const logoInLight = await page.locator('header svg[role="img"]').count() > 0;
    report("Light mode Logo 存在", logoInLight);
  } else {
    report("主题切换按钮存在", false, "未找到按钮");
  }

  await context.close();

  // ========================================================================
  // 测试组 4: 响应式布局
  // ========================================================================
  console.log("\n▶ 测试组 4: 响应式布局");

  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 667 },
    colorScheme: "dark",
    locale: "zh-CN"
  });

  await mobileContext.addInitScript(() => {
    localStorage.setItem("deep-agent-config-v2", JSON.stringify({
      deploymentUrl: "http://localhost:2024",
      assistantId: "pmagent"
    }));
  });

  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30000 });
  await mobilePage.waitForTimeout(2000);

  // 截图记录
  await mobilePage.screenshot({ path: "test-visual-mobile.png", fullPage: false });
  console.log("  📸 Mobile: test-visual-mobile.png");

  // 验证 Logo 在 mobile 下存在
  const mobileLogo = await mobilePage.locator('header svg[role="img"]').count() > 0;
  report("Mobile Logo 存在", mobileLogo);

  // 验证 Header 布局
  const headerExists = await mobilePage.locator('header').count() > 0;
  report("Mobile Header 存在", headerExists);

  await mobileContext.close();

  // ========================================================================
  // 测试组 5: Header 布局
  // ========================================================================
  console.log("\n▶ 测试组 5: Header 布局");

  const desktopContext = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    colorScheme: "dark",
    locale: "zh-CN"
  });

  await desktopContext.addInitScript(() => {
    localStorage.setItem("deep-agent-config-v2", JSON.stringify({
      deploymentUrl: "http://localhost:2024",
      assistantId: "pmagent"
    }));
  });

  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30000 });
  await desktopPage.waitForTimeout(2000);

  // 验证 Header 元素 (AZUNE Wordmark SVG)
  const headerWordmark = await desktopPage.locator('header svg[aria-label="AZUNE"]').count() > 0;
  report("Header AZUNE Wordmark SVG", headerWordmark);

  // 验证 Threads 按钮
  const threadsButton = await desktopPage.locator('button:has-text("Threads")').count() > 0;
  report("Threads 按钮存在", threadsButton);

  // 验证任务工作台按钮
  const taskButton = await desktopPage.locator('button:has-text("任务工作台")').count() > 0;
  report("任务工作台按钮存在", taskButton);

  // 验证 New Thread 按钮
  const newThreadButton = await desktopPage.locator('button:has-text("New Thread")').count() > 0;
  report("New Thread 按钮存在", newThreadButton);

  // 截图记录
  await desktopPage.screenshot({ path: "test-visual-header.png", fullPage: false });
  console.log("  📸 Header: test-visual-header.png");

  await desktopContext.close();

  // ========================================================================
  // 测试组 6: 可访问性
  // ========================================================================
  console.log("\n▶ 测试组 6: 可访问性");

  const a11yContext = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    colorScheme: "dark",
    locale: "zh-CN"
  });

  await a11yContext.addInitScript(() => {
    localStorage.setItem("deep-agent-config-v2", JSON.stringify({
      deploymentUrl: "http://localhost:2024",
      assistantId: "pmagent"
    }));
  });

  const a11yPage = await a11yContext.newPage();
  await a11yPage.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30000 });
  await a11yPage.waitForTimeout(2000);

  // 验证 Logo 可访问性 (AZUNE Wordmark)
  const logoAccessible = await a11yPage.locator('header svg[aria-label="AZUNE"]').count() > 0;
  report("Logo 可访问性 (AZUNE Wordmark)", logoAccessible);

  // 验证按钮 aria-label
  const themeBtnAria = await a11yPage.locator('button[aria-label*="Switch to"]').count() > 0;
  report("主题按钮 ARIA 标签", themeBtnAria);

  await a11yContext.close();
  await browser.close();

  // ========================================================================
  // 结果汇总
  // ========================================================================
  console.log("\n" + "=".repeat(70));
  console.log(` 全面视觉走查结果: ${passCount} PASS / ${failCount} FAIL / ${passCount + failCount} TOTAL`);
  console.log("=".repeat(70));

  if (failCount > 0) {
    console.log("\n❌ 失败项:");
    for (const r of results.filter(r => r.status.includes("FAIL"))) {
      console.log(`  ${r.name}: ${r.detail}`);
    }
  }

  const passRate = Math.round(passCount / (passCount + failCount) * 100);
  console.log(`\n📈 通过率: ${passRate}%`);

  if (passRate >= 95) {
    console.log("\n🎉 全面视觉走查通过！");
  } else if (passRate >= 80) {
    console.log("\n⚠️  全面视觉走查基本通过。");
  } else {
    console.log("\n❌ 全面视觉走查未通过。");
  }

  fs.writeFileSync("test-visual-comprehensive-results.json", JSON.stringify({
    timestamp: new Date().toISOString(),
    passRate,
    passCount,
    failCount,
    results,
    screenshots: [
      "test-visual-logo-dark.png",
      "test-visual-theme-light.png",
      "test-visual-mobile.png",
      "test-visual-header.png"
    ]
  }, null, 2));

  process.exit(failCount > 0 ? 1 : 0);
})();
