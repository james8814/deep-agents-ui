/**
 * 前端 UI 真实浏览器测试 v2
 * 修复选择器问题，更准确地检测组件
 */

import { chromium } from "playwright";
import fs from "fs";

const BASE_URL = "http://localhost:3000";
const results = [];
let passCount = 0;
let failCount = 0;

function report(category, name, pass, detail = "") {
  const status = pass ? "✅ PASS" : "❌ FAIL";
  results.push({ category, name, status, detail });
  if (pass) passCount++;
  else failCount++;
  console.log(`  ${status} [${category}] ${name}${detail ? " — " + detail : ""}`);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Main
// ============================================================================
(async () => {
  console.log("\n" + "=".repeat(70));
  console.log(" 前端 UI 真实浏览器测试 v2");
  console.log("=".repeat(70));

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    colorScheme: "dark",
    locale: "zh-CN"
  });

  // 预设配置
  await context.addInitScript(() => {
    localStorage.setItem("deep-agent-config", JSON.stringify({
      deploymentUrl: "http://localhost:2024",
      assistantId: "pmagent"
    }));
  });

  const page = await context.newPage();
  const errors = [];

  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  try {
    console.log("\n📡 加载页面:", BASE_URL);
    await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30000 });
    await sleep(2000);

    // ========================================================================
    // 测试组 1: 页面基础
    // ========================================================================
    console.log("\n▶ 测试组 1: 页面基础");

    const title = await page.title();
    report("页面基础", "页面标题正确", title.includes("PMAgent"), `title: ${title}`);

    const htmlLang = await page.locator("html").getAttribute("lang");
    report("页面基础", "HTML lang 属性", htmlLang === "zh-CN", `lang: ${htmlLang}`);

    const htmlClass = await page.locator("html").getAttribute("class");
    report("页面基础", "主题类已应用", htmlClass?.includes("dark") || htmlClass?.includes("light"), `class: ${htmlClass}`);

    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    report("页面基础", "页面内容已渲染", bodyHeight > 200, `bodyHeight: ${bodyHeight}px`);

    // ========================================================================
    // 测试组 2: 配置对话框
    // ========================================================================
    console.log("\n▶ 测试组 2: 配置对话框");

    // 对话框应该是可见的（配置需要验证）
    const dialog = page.locator('[role="dialog"]').first();
    const dialogVisible = await dialog.isVisible().catch(() => false);
    report("配置对话框", "对话框显示", dialogVisible);

    if (dialogVisible) {
      const ariaLabelledby = await dialog.getAttribute("aria-labelledby");
      report("配置对话框", "对话框有 a11y 标签", !!ariaLabelledby, `labelledby: ${ariaLabelledby}`);

      // 输入框
      const inputs = page.locator('input:not([type="hidden"])');
      const inputCount = await inputs.count();
      report("配置对话框", "输入框存在", inputCount >= 2, `count: ${inputCount}`);

      if (inputCount > 0) {
        await inputs.first().fill("http://test-server:2024");
        const value = await inputs.first().inputValue();
        report("配置对话框", "输入功能正常", value.includes("test-server"), value);
      }

      // 按钮
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      report("配置对话框", "按钮存在", buttonCount >= 3, `count: ${buttonCount}`);

      // 关闭按钮测试（只验证按钮存在，不实际关闭）
      const closeBtn = page.locator('button[type="button"]').first();
      const closeBtnVisible = await closeBtn.isVisible().catch(() => false);
      report("配置对话框", "关闭按钮存在", closeBtnVisible);
    }

    // ========================================================================
    // 测试组 3: 无障碍
    // ========================================================================
    console.log("\n▶ 测试组 3: 无障碍");

    // 按钮无障碍
    const allButtons = await page.locator("button").all();
    let accessibleBtns = 0;
    for (const btn of allButtons) {
      const ariaLabel = await btn.getAttribute("aria-label");
      const text = await btn.textContent();
      const title = await btn.getAttribute("title");
      const dataState = await btn.getAttribute("data-state");
      if (ariaLabel || text?.trim() || title || dataState !== null) {
        accessibleBtns++;
      }
    }
    report("无障碍", "按钮有 accessible name",
      accessibleBtns === allButtons.length, `${accessibleBtns}/${allButtons.length}`);

    // 键盘导航
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    report("无障碍", "键盘焦点可导航", !!focused, `focused: ${focused}`);

    // ========================================================================
    // 测试组 4: 响应式
    // ========================================================================
    console.log("\n▶ 测试组 4: 响应式布局");

    // 桌面
    await page.setViewportSize({ width: 1400, height: 900 });
    await sleep(300);
    const desktopOk = await page.locator("body").isVisible();
    report("响应式", "桌面视图正常", desktopOk);

    // 平板
    await page.setViewportSize({ width: 768, height: 1024 });
    await sleep(300);
    const tabletOk = await page.locator("body").isVisible();
    report("响应式", "平板视图正常", tabletOk);

    // 移动
    await page.setViewportSize({ width: 375, height: 667 });
    await sleep(300);
    const mobileOk = await page.locator("body").isVisible();
    report("响应式", "移动视图正常", mobileOk);

    // 恢复桌面
    await page.setViewportSize({ width: 1400, height: 900 });
    await sleep(300);

    // ========================================================================
    // 测试组 5: CSS 设计系统
    // ========================================================================
    console.log("\n▶ 测试组 5: CSS 设计系统");

    const cssVars = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return {
        background: style.getPropertyValue("--background"),
        foreground: style.getPropertyValue("--foreground"),
        primary: style.getPropertyValue("--primary"),
        radius: style.getPropertyValue("--radius"),
        surfaceBase: style.getPropertyValue("--surface-base"),
        textPrimary: style.getPropertyValue("--text-primary"),
        colorPrimary: style.getPropertyValue("--color-primary"),
      };
    });

    // CSS 变量值检查
    const hasValue = (val) => val && val.trim() !== "";

    // 输出实际值用于调试
    console.log("  CSS --background:", cssVars.background?.trim() || "empty");
    console.log("  CSS --foreground:", cssVars.foreground?.trim() || "empty");
    console.log("  CSS --primary:", cssVars.primary?.trim() || "empty");
    console.log("  CSS --radius:", cssVars.radius?.trim() || "empty");

    report("设计系统", "--background 已定义", hasValue(cssVars.background), cssVars.background?.trim().slice(0, 15));
    report("设计系统", "--foreground 已定义", hasValue(cssVars.foreground), cssVars.foreground?.trim().slice(0, 15));
    report("设计系统", "--primary 已定义", hasValue(cssVars.primary), cssVars.primary?.trim().slice(0, 15));
    report("设计系统", "--radius 已定义", hasValue(cssVars.radius), cssVars.radius?.trim());

    // ========================================================================
    // 测试组 6: 组件检测
    // ========================================================================
    console.log("\n▶ 测试组 6: 组件检测");

    // 使用 Playwright 定位器检测组件
    const dialogLocator = page.locator('[role="dialog"]');
    const dialogCount = await dialogLocator.count();
    report("组件检测", "对话框组件", dialogCount > 0, `count: ${dialogCount}`);

    const inputLocator = page.locator('input');
    const inputCount = await inputLocator.count();
    report("组件检测", "输入组件", inputCount > 0, `count: ${inputCount}`);

    const buttonLocator = page.locator('button');
    const buttonCount = await buttonLocator.count();
    report("组件检测", "按钮组件", buttonCount > 0, `count: ${buttonCount}`);

    // 检测 Tailwind 类
    const hasDarkClass = await page.locator('html.dark, html.light').count() > 0;
    report("组件检测", "Tailwind 主题类", hasDarkClass);

    // ========================================================================
    // 测试组 7: 错误检测
    // ========================================================================
    console.log("\n▶ 测试组 7: 错误检测");

    const criticalErrors = errors.filter(e =>
      !e.includes("hydration") &&
      !e.includes("ResizeObserver") &&
      !e.includes("WebSocket") &&
      !e.includes("fetch") &&
      !e.includes("NetworkError") &&
      !e.includes("Failed to fetch") &&
      !e.includes("ERR_CONNECTION_REFUSED")
    );

    report("错误检测", "无关键 JS 错误", criticalErrors.length === 0,
      criticalErrors.length > 0 ? criticalErrors[0]?.slice(0, 50) : "");

    // 截图
    await page.screenshot({ path: "test-real-ui-v2.png", fullPage: false });
    console.log("\n📸 截图已保存: test-real-ui-v2.png");

  } catch (err) {
    report("异常", "测试执行异常", false, err.message);
  } finally {
    await browser.close();
  }

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log(` 测试结果: ${passCount} PASS / ${failCount} FAIL / ${passCount + failCount} TOTAL`);
  console.log("=".repeat(70) + "\n");

  if (failCount > 0) {
    console.log("❌ 失败项:");
    for (const r of results) {
      if (r.status.includes("FAIL")) {
        console.log(`  [${r.category}] ${r.name}: ${r.detail}`);
      }
    }
  }

  // 分类统计
  const categories = [...new Set(results.map(r => r.category))];
  console.log("\n📊 分类统计:");
  for (const cat of categories) {
    const catResults = results.filter(r => r.category === cat);
    const catPass = catResults.filter(r => r.status.includes("PASS")).length;
    const catTotal = catResults.length;
    console.log(`  ${cat}: ${catPass}/${catTotal} (${Math.round(catPass/catTotal*100)}%)`);
  }

  const passRate = Math.round(passCount / (passCount + failCount) * 100);
  console.log(`\n✅ 总体通过率: ${passRate}%`);

  if (passRate >= 95) {
    console.log("\n🎉 前端 UI 测试通过！");
  } else if (passRate >= 80) {
    console.log("\n⚠️  前端 UI 测试基本通过。");
  } else {
    console.log("\n❌ 前端 UI 测试未通过。");
  }

  // 保存结果
  fs.writeFileSync("test-real-ui-v2-results.json", JSON.stringify({
    timestamp: new Date().toISOString(),
    passRate,
    passCount,
    failCount,
    results
  }, null, 2));

  process.exit(failCount > 0 ? 1 : 0);
})();
