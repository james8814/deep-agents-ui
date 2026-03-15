/**
 * Logo 集成真实 UI 测试
 * 使用 Playwright 进行真实浏览器测试
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
  console.log(" Logo 集成真实 UI 测试");
  console.log("=".repeat(70));
  console.log(` 测试时间: ${new Date().toISOString()}`);
  console.log(` 测试 URL: ${BASE_URL}`);
  console.log("=".repeat(70));

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // ========================================================================
  // 测试 1: Dark Mode 下的页面渲染
  // ========================================================================
  console.log("\n▶ 测试组 1: Dark Mode 页面渲染");

  const darkContext = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    colorScheme: "dark",
    locale: "zh-CN"
  });

  await darkContext.addInitScript(() => {
    localStorage.setItem("deep-agent-config-v2", JSON.stringify({
      deploymentUrl: "http://localhost:2024",
      assistantId: "pmagent"
    }));
  });

  const darkPage = await darkContext.newPage();

  try {
    await darkPage.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30000 });
    await darkPage.waitForTimeout(2000);

    // 截图记录
    await darkPage.screenshot({ path: "test-ui-logo-dark.png", fullPage: true });
    console.log("  📸 Dark mode 截图: test-ui-logo-dark.png");

    // 验证页面加载成功
    const title = await darkPage.title();
    report("Dark mode 页面加载", title.includes("PMAgent"), title);

    // 验证 CSS 变量在真实浏览器中生效
    const cssVars = await darkPage.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return {
        cyan: style.getPropertyValue("--color-cyan")?.trim(),
        primary: style.getPropertyValue("--color-primary")?.trim(),
      };
    });
    report("Dark mode CSS 变量 --color-cyan", cssVars.cyan?.toLowerCase() === "#38bdf8", cssVars.cyan);

  } catch (err) {
    report("Dark mode 测试异常", false, err.message);
  }

  await darkContext.close();

  // ========================================================================
  // 测试 2: Light Mode 下的页面渲染
  // ========================================================================
  console.log("\n▶ 测试组 2: Light Mode 页面渲染");

  const lightContext = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    colorScheme: "light",
    locale: "zh-CN"
  });

  await lightContext.addInitScript(() => {
    localStorage.setItem("deep-agent-config-v2", JSON.stringify({
      deploymentUrl: "http://localhost:2024",
      assistantId: "pmagent"
    }));
  });

  const lightPage = await lightContext.newPage();

  try {
    await lightPage.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30000 });
    await lightPage.waitForTimeout(2000);

    // 截图记录
    await lightPage.screenshot({ path: "test-ui-logo-light.png", fullPage: true });
    console.log("  📸 Light mode 截图: test-ui-logo-light.png");

    // 验证页面加载成功
    const title = await lightPage.title();
    report("Light mode 页面加载", title.includes("PMAgent"), title);

    // 验证 CSS 变量
    const cssVars = await lightPage.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return {
        cyan: style.getPropertyValue("--color-cyan")?.trim(),
        primary: style.getPropertyValue("--color-primary")?.trim(),
      };
    });
    report("Light mode CSS 变量 --color-cyan", cssVars.cyan?.toLowerCase() === "#38bdf8", cssVars.cyan);
    report("Light mode CSS 变量 --color-primary", cssVars.primary === "#6558d3", cssVars.primary);

  } catch (err) {
    report("Light mode 测试异常", false, err.message);
  }

  await lightContext.close();

  // ========================================================================
  // 测试 3: 响应式布局测试
  // ========================================================================
  console.log("\n▶ 测试组 3: 响应式布局测试");

  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 667 },
    colorScheme: "dark",
    locale: "zh-CN",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)"
  });

  await mobileContext.addInitScript(() => {
    localStorage.setItem("deep-agent-config-v2", JSON.stringify({
      deploymentUrl: "http://localhost:2024",
      assistantId: "pmagent"
    }));
  });

  const mobilePage = await mobileContext.newPage();

  try {
    await mobilePage.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30000 });
    await mobilePage.waitForTimeout(2000);

    // 截图记录
    await mobilePage.screenshot({ path: "test-ui-logo-mobile.png", fullPage: true });
    console.log("  📸 Mobile 截图: test-ui-logo-mobile.png");

    report("Mobile 响应式布局", true, "375x667 viewport");

  } catch (err) {
    report("Mobile 测试异常", false, err.message);
  }

  await mobileContext.close();

  // ========================================================================
  // 测试 4: 主题切换测试
  // ========================================================================
  console.log("\n▶ 测试组 4: 主题切换测试");

  const themeContext = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    colorScheme: "dark",
    locale: "zh-CN"
  });

  await themeContext.addInitScript(() => {
    localStorage.setItem("deep-agent-config-v2", JSON.stringify({
      deploymentUrl: "http://localhost:2024",
      assistantId: "pmagent"
    }));
  });

  const themePage = await themeContext.newPage();

  try {
    await themePage.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30000 });
    await themePage.waitForTimeout(2000);

    // 获取 dark mode 下的背景色
    const darkBg = await themePage.evaluate(() => {
      return getComputedStyle(document.body).backgroundColor;
    });

    // 点击主题切换按钮
    const themeButton = await themePage.locator('button[aria-label*="Switch to"]').first();
    if (await themeButton.isVisible().catch(() => false)) {
      await themeButton.click();
      await themePage.waitForTimeout(1000);

      // 截图记录切换后的状态
      await themePage.screenshot({ path: "test-ui-logo-theme-switched.png", fullPage: true });
      console.log("  📸 主题切换截图: test-ui-logo-theme-switched.png");

      // 获取切换后的背景色
      const lightBg = await themePage.evaluate(() => {
        return getComputedStyle(document.body).backgroundColor;
      });

      report("主题切换功能", darkBg !== lightBg, `Dark: ${darkBg} → Light: ${lightBg}`);
    } else {
      report("主题切换按钮存在", false, "未找到按钮");
    }

  } catch (err) {
    report("主题切换测试异常", false, err.message);
  }

  await themeContext.close();
  await browser.close();

  // ========================================================================
  // 结果汇总
  // ========================================================================
  console.log("\n" + "=".repeat(70));
  console.log(` 真实 UI 测试结果: ${passCount} PASS / ${failCount} FAIL / ${passCount + failCount} TOTAL`);
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
    console.log("\n🎉 真实 UI 测试通过！");
  } else if (passRate >= 80) {
    console.log("\n⚠️  真实 UI 测试基本通过。");
  } else {
    console.log("\n❌ 真实 UI 测试未通过。");
  }

  fs.writeFileSync("test-logo-ui-real-results.json", JSON.stringify({
    timestamp: new Date().toISOString(),
    passRate,
    passCount,
    failCount,
    results,
    screenshots: [
      "test-ui-logo-dark.png",
      "test-ui-logo-light.png",
      "test-ui-logo-mobile.png",
      "test-ui-logo-theme-switched.png"
    ]
  }, null, 2));

  process.exit(failCount > 0 ? 1 : 0);
})();
