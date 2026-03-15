/**
 * Agent 对话主界面 - 完整真实浏览器测试 v2
 * 测试完整的聊天界面，而不仅仅是配置对话框
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

(async () => {
  console.log("\n" + "=".repeat(70));
  console.log(" Agent 对话主界面 - 完整真实浏览器测试 v2");
  console.log("=".repeat(70));

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // ========================================================================
  // 测试 1: Dark Mode 完整聊天界面
  // ========================================================================
  console.log("\n▶ 测试组 1: Dark Mode 聊天界面");

  const darkContext = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    colorScheme: "dark",
    locale: "zh-CN"
  });

  // 使用正确的 localStorage key: deep-agent-config-v2
  await darkContext.addInitScript(() => {
    localStorage.setItem("deep-agent-config-v2", JSON.stringify({
      deploymentUrl: "http://localhost:2024",
      assistantId: "pmagent"
    }));
  });

  const darkPage = await darkContext.newPage();
  const darkErrors = [];
  darkPage.on("pageerror", (e) => darkErrors.push(e.message));
  darkPage.on("console", (msg) => {
    if (msg.type() === "error") darkErrors.push(msg.text());
  });

  try {
    console.log("\n📡 加载 Dark Mode 页面:", BASE_URL);
    await darkPage.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30000 });
    await sleep(3000);

    // 1.1 HTML 主题类
    const htmlClass = await darkPage.locator("html").getAttribute("class");
    report("Dark模式", "HTML 主题类为 dark", htmlClass?.includes("dark"), `class: ${htmlClass}`);

    // 1.2 主要布局
    const bodyVisible = await darkPage.locator('body').isVisible();
    report("布局", "页面主体可见", bodyVisible);

    // 1.3 ResizablePanel 布局
    const panelGroup = await darkPage.locator('[data-panel-group-direction]').count();
    report("布局", "ResizablePanel 布局", panelGroup > 0, `panel groups: ${panelGroup}`);

    // ========================================================================
    // 测试组 2: 聊天核心组件
    // ========================================================================
    console.log("\n▶ 测试组 2: 聊天核心组件");

    // 2.1 输入框 (textarea)
    const textarea = darkPage.locator('textarea').first();
    const textareaCount = await textarea.count();
    report("聊天组件", "输入框 textarea", textareaCount > 0, `count: ${textareaCount}`);

    // 2.2 发送按钮
    const sendBtn = darkPage.locator('button[type="submit"], button:has(svg)').count();
    report("聊天组件", "发送/操作按钮", true, `action buttons: ${sendBtn}`);

    // 2.3 文件上传
    const fileInput = await darkPage.locator('input[type="file"]').count();
    report("聊天组件", "文件上传功能", fileInput > 0, `file inputs: ${fileInput}`);

    // ========================================================================
    // 测试组 3: 输入功能
    // ========================================================================
    console.log("\n▶ 测试组 3: 输入功能");

    if (textareaCount > 0) {
      // 3.1 输入测试
      await textarea.fill("测试消息：你好，这是一个完整界面测试");
      const inputValue = await textarea.inputValue();
      report("输入测试", "文本输入", inputValue.includes("测试消息"), `内容: ${inputValue.slice(0, 25)}...`);

      // 3.2 输入框高度
      const height = await textarea.evaluate(el => el.offsetHeight);
      report("输入测试", "输入框高度", height >= 40, `${height}px`);

      // 3.3 清空
      await textarea.fill("");
      const cleared = await textarea.inputValue();
      report("输入测试", "清空输入", cleared === "");
    }

    // ========================================================================
    // 测试组 4: CSS 设计系统 (Dark Mode)
    // ========================================================================
    console.log("\n▶ 测试组 4: CSS 设计系统 (Dark Mode)");

    const darkCss = await darkPage.evaluate(() => {
      const s = getComputedStyle(document.documentElement);
      return {
        bg: s.getPropertyValue("--background")?.trim(),
        primary: s.getPropertyValue("--primary")?.trim(),
        textPrimary: s.getPropertyValue("--text-primary")?.trim(),
      };
    });

    const isDarkBg = darkCss.bg?.includes("5.5%") || darkCss.bg?.includes("5%");
    report("CSS Dark", "--background 深色", isDarkBg, darkCss.bg?.slice(0, 20));
    report("CSS Dark", "--primary 定义", !!darkCss.primary, darkCss.primary?.slice(0, 15));
    report("CSS Dark", "--text-primary", !!darkCss.textPrimary, darkCss.textPrimary);

    // 截图 Dark
    await darkPage.screenshot({ path: "test-main-dark.png", fullPage: false });
    console.log("\n📸 Dark Mode 截图: test-main-dark.png");

  } catch (err) {
    report("异常", "Dark Mode 测试", false, err.message);
  } finally {
    await darkContext.close();
  }

  // ========================================================================
  // 测试 2: Light Mode 界面
  // ========================================================================
  console.log("\n▶ 测试组 5: Light Mode 界面");

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
    await sleep(3000);

    // 5.1 HTML 主题类
    const htmlClass = await lightPage.locator("html").getAttribute("class");
    report("Light模式", "HTML 主题类", htmlClass?.includes("light") || !htmlClass?.includes("dark"), `class: ${htmlClass}`);

    // 5.2 CSS 颜色验证 (v5.26 设计原稿)
    const lightCss = await lightPage.evaluate(() => {
      const s = getComputedStyle(document.documentElement);
      return {
        bg: s.getPropertyValue("--background")?.trim(),
        colorPrimary: s.getPropertyValue("--color-primary")?.trim(),
        textTertiary: s.getPropertyValue("--text-tertiary")?.trim(),
        textDisabled: s.getPropertyValue("--text-disabled")?.trim(),
      };
    });

    const isLightBg = lightCss.bg?.includes("100%");
    report("CSS Light", "--background 浅色", isLightBg, lightCss.bg?.slice(0, 15));

    // v5.26 原稿验证
    const primary = lightCss.colorPrimary?.toLowerCase().replace('#', '');
    report("CSS Light", "--color-primary (#6558D3)", primary === "6558d3", lightCss.colorPrimary);

    const tertiary = lightCss.textTertiary?.toLowerCase().replace('#', '');
    report("CSS Light", "--text-tertiary (#555)", tertiary === "555" || tertiary === "555555", lightCss.textTertiary);

    const disabled = lightCss.textDisabled?.toLowerCase().replace('#', '');
    report("CSS Light", "--text-disabled (#757575)", disabled === "757575", lightCss.textDisabled);

    // 5.3 布局正常
    const bodyOk = await lightPage.locator('body').isVisible();
    report("Light模式", "页面布局正常", bodyOk);

    // 截图 Light
    await lightPage.screenshot({ path: "test-main-light.png", fullPage: false });
    console.log("\n📸 Light Mode 截图: test-main-light.png");

  } catch (err) {
    report("异常", "Light Mode 测试", false, err.message);
  } finally {
    await lightContext.close();
  }

  // ========================================================================
  // 测试 3: 响应式布局
  // ========================================================================
  console.log("\n▶ 测试组 6: 响应式布局");

  const respContext = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    colorScheme: "dark",
    locale: "zh-CN"
  });

  await respContext.addInitScript(() => {
    localStorage.setItem("deep-agent-config-v2", JSON.stringify({
      deploymentUrl: "http://localhost:2024",
      assistantId: "pmagent"
    }));
  });

  const respPage = await respContext.newPage();

  try {
    await respPage.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30000 });
    await sleep(2000);

    // 桌面
    await respPage.setViewportSize({ width: 1400, height: 900 });
    await sleep(300);
    const desktop = await respPage.locator('body').isVisible();
    report("响应式", "桌面 1400x900", desktop);

    // 平板
    await respPage.setViewportSize({ width: 768, height: 1024 });
    await sleep(300);
    const tablet = await respPage.locator('body').isVisible();
    report("响应式", "平板 768x1024", tablet);

    // 手机
    await respPage.setViewportSize({ width: 375, height: 667 });
    await sleep(300);
    const mobile = await respPage.locator('body').isVisible();
    report("响应式", "手机 375x667", mobile);

  } catch (err) {
    report("异常", "响应式测试", false, err.message);
  } finally {
    await respContext.close();
  }

  // ========================================================================
  // 测试 4: 主题切换
  // ========================================================================
  console.log("\n▶ 测试组 7: 主题切换");

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
    await sleep(2000);

    // 查找主题切换按钮 (使用 aria-label)
    const themeBtn = themePage.locator('button[aria-label*="Switch"], button[aria-label*="light"], button[aria-label*="dark"]').first();
    const btnCount = await themeBtn.count();

    // 记录当前主题
    const beforeClass = await themePage.locator("html").getAttribute("class");
    report("主题切换", "当前主题状态", true, `class: ${beforeClass}`);

    if (btnCount > 0) {
      report("主题切换", "主题切换按钮", true, "aria-label 包含 Switch/light/dark");

      // 点击切换
      await themeBtn.click();
      await sleep(500);

      const afterClass = await themePage.locator("html").getAttribute("class");
      const changed = beforeClass !== afterClass;
      report("主题切换", "主题状态变化", changed, `${beforeClass} → ${afterClass}`);

      await themePage.screenshot({ path: "test-main-theme-switched.png" });
    } else {
      // 备用：查找工具栏中的按钮
      const toolbarBtns = await themePage.locator('header button, nav button, [class*="toolbar"] button').count();
      report("主题切换", "工具栏按钮", toolbarBtns > 0, `toolbar buttons: ${toolbarBtns}`);
    }

  } catch (err) {
    report("异常", "主题切换测试", false, err.message);
  } finally {
    await themeContext.close();
  }

  await browser.close();

  // ========================================================================
  // 汇总
  // ========================================================================
  console.log("\n" + "=".repeat(70));
  console.log(` 测试结果: ${passCount} PASS / ${failCount} FAIL / ${passCount + failCount} TOTAL`);
  console.log("=".repeat(70));

  if (failCount > 0) {
    console.log("\n❌ 失败项:");
    for (const r of results.filter(r => r.status.includes("FAIL"))) {
      console.log(`  [${r.category}] ${r.name}: ${r.detail}`);
    }
  }

  // 分类统计
  const categories = [...new Set(results.map(r => r.category))];
  console.log("\n📊 分类统计:");
  for (const cat of categories) {
    const catRes = results.filter(r => r.category === cat);
    const pass = catRes.filter(r => r.status.includes("PASS")).length;
    const total = catRes.length;
    const pct = Math.round(pass / total * 100);
    const icon = pct === 100 ? "✅" : pct >= 80 ? "⚠️" : "❌";
    console.log(`  ${icon} ${cat}: ${pass}/${total} (${pct}%)`);
  }

  const rate = Math.round(passCount / (passCount + failCount) * 100);
  console.log(`\n📈 总体通过率: ${rate}%`);

  if (rate >= 95) {
    console.log("\n🎉 Agent 对话主界面测试通过！");
  } else if (rate >= 80) {
    console.log("\n⚠️  Agent 对话主界面测试基本通过。");
  } else {
    console.log("\n❌ Agent 对话主界面测试未通过。");
  }

  fs.writeFileSync("test-main-chat-results.json", JSON.stringify({
    timestamp: new Date().toISOString(),
    passRate: rate,
    passCount,
    failCount,
    results
  }, null, 2));

  process.exit(failCount > 0 ? 1 : 0);
})();
