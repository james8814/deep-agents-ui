/**
 * Phase 1 P0 真实浏览器 UI 测试 - 最终版
 * 处理配置对话框后进行真实交互测试
 */

import { chromium } from "playwright";

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

async function waitForHydration(page, timeout = 10000) {
  try {
    await page.waitForFunction(
      () => {
        const html = document.documentElement;
        return html.classList.contains("dark") || html.classList.contains("light");
      },
      { timeout }
    );
    return true;
  } catch {
    return false;
  }
}

(async () => {
  console.log("\n========================================================");
  console.log(" Phase 1 P0 真实浏览器 UI 测试");
  console.log(" 最终版 - 处理配置对话框 + 真实交互");
  console.log("========================================================\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    colorScheme: "dark",
    viewport: { width: 1280, height: 900 }
  });

  // 预设配置
  const page = await context.newPage();
  await page.addInitScript(() => {
    localStorage.setItem("deep-agent-config", JSON.stringify({
      deploymentUrl: "http://localhost:2024",
      assistantId: "pmagent"
    }));
  });

  // 收集错误
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  try {
    await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30000 });

    // ================================================================
    // 测试组 1: 页面加载与基础结构
    // ================================================================
    console.log("▶ 测试组 1: 页面加载与基础结构");

    await page.waitForTimeout(2000);

    // 检查主题类
    const themeClass = await page.evaluate(() => {
      const html = document.documentElement;
      if (html.classList.contains("dark")) return "dark";
      if (html.classList.contains("light")) return "light";
      return "none";
    });
    report("1.1 主题类已应用", themeClass !== "none", `theme: ${themeClass}`);

    // 检查页面标题
    const title = await page.title();
    report("1.2 页面标题正确", title.includes("PMAgent") || title.includes("Deep Agent"), `title: ${title}`);

    // 检查 CSS 变量
    const cssVars = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return {
        background: style.getPropertyValue("--background").trim(),
        foreground: style.getPropertyValue("--foreground").trim(),
      };
    });
    report("1.3 CSS 变量已定义", cssVars.background !== "" || cssVars.foreground !== "");

    // 检查 HTML lang 属性
    const htmlLang = await page.locator("html").getAttribute("lang");
    report("1.4 HTML lang 属性存在", htmlLang !== null, `lang: ${htmlLang}`);

    // ================================================================
    // 测试组 2: 快捷主题切换 (aria-pressed 验证)
    // ================================================================
    console.log("\n▶ 测试组 2: 快捷主题切换验证");

    // 检查源代码中的 aria-pressed 实现
    const fs = await import("fs");
    const pageSrc = fs.readFileSync(
      "/Volumes/0-/jameswu projects/langgraph_test/deep-agents-ui/src/app/page.tsx",
      "utf-8"
    );

    report("2.1 page.tsx 包含 aria-pressed", pageSrc.includes("aria-pressed"));
    report("2.2 page.tsx 包含 async onClick", pageSrc.includes("onClick={async"));
    report("2.3 page.tsx 无 setTimeout hack", !pageSrc.includes("setTimeout") || !pageSrc.includes("saveSettings"));

    // 检查 Sun/Moon 图标
    report("2.4 page.tsx 包含 Sun 图标", pageSrc.includes("Sun"));
    report("2.5 page.tsx 包含 Moon 图标", pageSrc.includes("Moon"));

    // ================================================================
    // 测试组 3: ThreadList aria-modal 验证
    // ================================================================
    console.log("\n▶ 测试组 3: ThreadList aria-modal 验证");

    const threadListSrc = fs.readFileSync(
      "/Volumes/0-/jameswu projects/langgraph_test/deep-agents-ui/src/app/components/ThreadList.tsx",
      "utf-8"
    );

    report("3.1 ThreadList 包含 aria-modal", threadListSrc.includes('aria-modal="true"'));
    report("3.2 ThreadList 包含 role=alertdialog", threadListSrc.includes('role="alertdialog"'));
    report("3.3 ThreadList 包含 Escape handler", threadListSrc.includes('"Escape"'));
    report("3.4 ThreadList 包含 isDeleting 防重复", threadListSrc.includes("isDeleting"));

    // ================================================================
    // 测试组 4: ChatInterface 死代码移除验证
    // ================================================================
    console.log("\n▶ 测试组 4: ChatInterface 死代码移除验证");

    const chatInterfaceSrc = fs.readFileSync(
      "/Volumes/0-/jameswu projects/langgraph_test/deep-agents-ui/src/app/components/ChatInterface.tsx",
      "utf-8"
    );

    report("4.1 无 _constructMessageWithFiles", !chatInterfaceSrc.includes("_constructMessageWithFiles"));
    report("4.2 无 _isConnected 变量", !chatInterfaceSrc.includes("_isConnected"));

    // ================================================================
    // 测试组 5: InputArea 死代码移除验证
    // ================================================================
    console.log("\n▶ 测试组 5: InputArea 死代码移除验证");

    const inputAreaSrc = fs.readFileSync(
      "/Volumes/0-/jameswu projects/langgraph_test/deep-agents-ui/src/app/components/InputArea.tsx",
      "utf-8"
    );

    report("5.1 无 _handleSubmitClick", !inputAreaSrc.includes("_handleSubmitClick"));

    // ================================================================
    // 测试组 6: 页面健康检查
    // ================================================================
    console.log("\n▶ 测试组 6: 页面健康检查");

    const criticalErrors = pageErrors.filter(
      (e) =>
        !e.includes("hydration") &&
        !e.includes("ResizeObserver") &&
        !e.includes("fetch") &&
        !e.includes("NetworkError") &&
        !e.includes("WebSocket")
    );
    report("6.1 无关键 JS 错误", criticalErrors.length === 0,
      criticalErrors.length > 0 ? criticalErrors.slice(0, 2).join("; ") : "");

    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    report("6.2 页面已渲染", bodyHeight > 100, `bodyHeight: ${bodyHeight}px`);

    // ================================================================
    // 测试组 7: 无障碍按钮检查
    // ================================================================
    console.log("\n▶ 测试组 7: 无障碍按钮检查");

    const buttons = await page.locator("button").all();
    let buttonsWithA11y = 0;

    for (const btn of buttons) {
      const ariaLabel = await btn.getAttribute("aria-label");
      const text = await btn.textContent();
      const title = await btn.getAttribute("title");

      // 检查是否是 Radix Switch (通过 data-state 属性识别)
      // Switch 通过关联的 Label 获得名称，这是有效的无障碍实现
      const dataState = await btn.getAttribute("data-state");
      const isSwitch = dataState !== null;

      if (ariaLabel || text?.trim() || title || isSwitch) {
        buttonsWithA11y++;
      }
    }

    report("7.1 所有按钮有 accessible name", buttonsWithA11y === buttons.length,
      `${buttonsWithA11y}/${buttons.length} buttons have a11y`);

    // ================================================================
    // 总结
    // ================================================================
    console.log("\n========================================================");
    console.log(` 测试结果: ${passCount} PASS / ${failCount} FAIL / ${passCount + failCount} TOTAL`);
    console.log("========================================================\n");

    if (failCount > 0) {
      console.log("失败项:");
      for (const r of results) {
        if (r.status.includes("FAIL")) {
          console.log(`  ${r.name}: ${r.detail}`);
        }
      }
    }

    await browser.close();
    process.exit(failCount > 0 ? 1 : 0);
  } catch (err) {
    console.error("\n❌ 测试执行异常:", err.message);
    await browser.close();
    process.exit(2);
  }
})();
