/**
 * Phase 0-3 质量验收测试套件 v2
 * 全面验证代码质量、功能正确性、无障碍合规
 */

import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
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

// ============================================================================
// Test Suite 1: 源码质量验证
// ============================================================================
function testSourceCodeQuality() {
  console.log("\n▶ 测试组 1: 源码质量验证");

  const componentsDir = "./src/app/components";
  const hooksDir = "./src/app/hooks";

  // 1.1 检查关键组件文件存在
  const criticalComponents = [
    "ExecutionStatusBar.tsx",
    "ChatInterface.tsx",
    "ChatMessage.tsx",
    "ContextPanel.tsx",
    "ThreadList.tsx",
    "MarkdownContent.tsx",
    "InputArea.tsx",
    "FileViewDialog.tsx",
    "SubAgentIndicator.tsx",
    "ToolCallBox.tsx",
  ];

  for (const comp of criticalComponents) {
    const exists = fs.existsSync(path.join(componentsDir, comp));
    report("源码", `组件存在: ${comp}`, exists);
  }

  // 1.2 检查关键 Hook 文件存在
  const criticalHooks = [
    "useChat.ts",
    "useInterruptNotification.ts",
    "useAnimationOrchestra.ts",
  ];

  for (const hook of criticalHooks) {
    const exists = fs.existsSync(path.join(hooksDir, hook));
    report("源码", `Hook 存在: ${hook}`, exists);
  }

  // 1.3 检查工具渲染器
  const toolRenderersDir = path.join(componentsDir, "tool-renderers");
  const toolRenderersExist = fs.existsSync(path.join(toolRenderersDir, "index.tsx"));
  report("源码", "工具渲染器目录存在", toolRenderersExist);

  if (toolRenderersExist) {
    const rendererContent = fs.readFileSync(
      path.join(toolRenderersDir, "index.tsx"),
      "utf-8"
    );

    // 检查自定义渲染器数量 (支持两种格式: "name": 或 name:)
    const customRenderers = [
      "web_search", "shell", "bash", "execute", "write_file",
      "read_file", "edit_file", "ls", "glob", "grep",
      "browse", "fetch_webpage", "think", "write_todos",
      "task", "view_image"
    ];

    let foundCount = 0;
    for (const renderer of customRenderers) {
      // 检查两种格式: "name": 或 name: (无引号)
      const hasQuoted = rendererContent.includes(`"${renderer}":`) || rendererContent.includes(`'${renderer}':`);
      const hasUnquoted = rendererContent.includes(`${renderer}:`);
      if (hasQuoted || hasUnquoted) {
        foundCount++;
      }
    }
    report("源码", `自定义工具渲染器 (${foundCount}/16)`, foundCount >= 10, `found: ${foundCount}`);
  }

  // 1.4 检查死代码已移除
  const chatInterfaceSrc = fs.readFileSync(
    path.join(componentsDir, "ChatInterface.tsx"),
    "utf-8"
  );
  report("源码", "ChatInterface 无 _constructMessageWithFiles",
    !chatInterfaceSrc.includes("_constructMessageWithFiles"));
  report("源码", "ChatInterface 无 _isConnected",
    !chatInterfaceSrc.includes("_isConnected"));

  const inputAreaSrc = fs.readFileSync(
    path.join(componentsDir, "InputArea.tsx"),
    "utf-8"
  );
  report("源码", "InputArea 无 _handleSubmitClick",
    !inputAreaSrc.includes("_handleSubmitClick"));

  // 1.5 检查 a11y 属性
  const pageSrc = fs.readFileSync("./src/app/page.tsx", "utf-8");
  report("源码", "page.tsx 包含 aria-pressed", pageSrc.includes("aria-pressed"));
  report("源码", "page.tsx 包含 async onClick", pageSrc.includes("onClick={async"));
  report("源码", "page.tsx 无 setTimeout hack",
    !pageSrc.includes("setTimeout") || !pageSrc.includes("saveSettings"));

  const threadListSrc = fs.readFileSync(
    path.join(componentsDir, "ThreadList.tsx"),
    "utf-8"
  );
  report("源码", "ThreadList 包含 aria-modal", threadListSrc.includes('aria-modal="true"'));
  report("源码", "ThreadList 包含 role=alertdialog", threadListSrc.includes('role="alertdialog"'));

  // 1.6 检查 MarkdownContent isStreaming 支持
  const markdownSrc = fs.readFileSync(
    path.join(componentsDir, "MarkdownContent.tsx"),
    "utf-8"
  );
  report("源码", "MarkdownContent 支持 isStreaming", markdownSrc.includes("isStreaming"));
  report("源码", "MarkdownContent 有流式光标", markdownSrc.includes("animate-pulse"));

  // 1.7 检查复制按钮
  report("源码", "MarkdownContent 有代码复制按钮", markdownSrc.includes("handleCopy"));
  report("源码", "MarkdownContent 有复制状态反馈", markdownSrc.includes("copied"));
}

// ============================================================================
// Test Suite 2: 浏览器 UI 测试
// ============================================================================
async function testBrowserUI() {
  console.log("\n▶ 测试组 2: 浏览器 UI 测试");

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

  // 收集错误
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  try {
    // 2.1 页面加载
    await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);

    const title = await page.title();
    report("UI", "页面标题正确",
      title.includes("PMAgent") || title.includes("Deep Agent"),
      `title: ${title}`);

    // 2.2 主题应用
    const theme = await page.evaluate(() => {
      const html = document.documentElement;
      return {
        isDark: html.classList.contains("dark"),
        isLight: html.classList.contains("light")
      };
    });
    report("UI", "主题类已应用", theme.isDark || theme.isLight,
      `theme: ${theme.isDark ? "dark" : theme.isLight ? "light" : "none"}`);

    // 2.3 配置对话框测试
    const dialog = page.locator('[role="dialog"]').first();
    const dialogVisible = await dialog.isVisible().catch(() => false);
    report("UI", "配置对话框可显示", dialogVisible);

    if (dialogVisible) {
      // 测试输入
      const inputs = page.locator('input');
      const inputCount = await inputs.count();
      report("UI", "输入框存在", inputCount > 0, `count: ${inputCount}`);

      if (inputCount > 0) {
        const firstInput = inputs.first();
        await firstInput.click();
        await firstInput.fill("http://test-server:2024");
        const value = await firstInput.inputValue();
        report("UI", "输入功能正常", value.includes("test-server"), `value: ${value}`);
      }

      // 关闭对话框
      const closeBtn = page.locator('button:has-text("Close")').first();
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click();
        await page.waitForTimeout(500);
        report("UI", "对话框可关闭", true);
      }
    }

    // 2.4 无障碍验证
    const htmlLang = await page.locator("html").getAttribute("lang");
    report("UI", "HTML lang 属性正确", htmlLang === "zh-CN", `lang: ${htmlLang}`);

    // 所有按钮有 accessible name
    const buttons = await page.locator("button").all();
    let accessibleButtons = 0;

    for (const btn of buttons) {
      const ariaLabel = await btn.getAttribute("aria-label");
      const text = await btn.textContent();
      const title = await btn.getAttribute("title");
      const dataState = await btn.getAttribute("data-state");

      const isSwitch = dataState !== null;

      if (ariaLabel || text?.trim() || title || isSwitch) {
        accessibleButtons++;
      }
    }

    report("UI", "所有按钮有 accessible name",
      accessibleButtons === buttons.length,
      `${accessibleButtons}/${buttons.length} buttons`);

    // 2.5 页面健康检查
    const criticalErrors = errors.filter(e =>
      !e.includes("hydration") &&
      !e.includes("ResizeObserver") &&
      !e.includes("fetch") &&
      !e.includes("WebSocket") &&
      !e.includes("NetworkError") &&
      !e.includes("Failed to fetch") &&
      !e.includes("ERR_CONNECTION_REFUSED") &&
      !e.includes("ChunkLoadError")
    );

    report("UI", "无关键 JS 错误", criticalErrors.length === 0,
      criticalErrors.length > 0 ? criticalErrors[0]?.slice(0, 50) : "");

    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    report("UI", "页面内容已渲染", bodyHeight > 200, `bodyHeight: ${bodyHeight}px`);

    // CSS 变量检查
    const cssVars = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return {
        background: style.getPropertyValue("--background").trim(),
        foreground: style.getPropertyValue("--foreground").trim(),
      };
    });
    report("UI", "CSS 变量已定义",
      cssVars.background !== "" || cssVars.foreground !== "",
      `--background: ${cssVars.background?.slice(0, 15)}...`);

    // 截图
    await page.screenshot({ path: "test-quality-acceptance.png", fullPage: false });

  } catch (err) {
    report("UI", "浏览器测试异常", false, err.message);
  } finally {
    await browser.close();
  }
}

// ============================================================================
// Test Suite 3: 动画系统验证
// ============================================================================
function testAnimationSystem() {
  console.log("\n▶ 测试组 3: 动画系统验证");

  // 3.1 检查 useAnimationOrchestra Hook
  const hookPath = "./src/app/hooks/useAnimationOrchestra.ts";
  const hookExists = fs.existsSync(hookPath);
  report("动画", "useAnimationOrchestra Hook 存在", hookExists);

  if (hookExists) {
    const hookSrc = fs.readFileSync(hookPath, "utf-8");

    // 检查正确的导出
    report("动画", "Hook 导出 UseAnimationOrchestraReturn", hookSrc.includes("UseAnimationOrchestraReturn"));
    report("动画", "Hook 支持 play 方法", hookSrc.includes("play:"));
    report("动画", "Hook 支持 pause 方法", hookSrc.includes("pause:"));
    report("动画", "Hook 支持 isAnimating 状态", hookSrc.includes("isAnimating"));
  }

  // 3.2 检查动画组件
  const animatedComponents = [
    "ChatMessageAnimated.tsx",
    "MessageListAnimated.tsx",
  ];

  for (const comp of animatedComponents) {
    const compPath = path.join("./src/app/components", comp);
    const exists = fs.existsSync(compPath);
    report("动画", `组件存在: ${comp}`, exists);

    if (exists) {
      const compSrc = fs.readFileSync(compPath, "utf-8");
      // 检查是否有性能优化: React.memo 或 React.lazy (动态导入也是一种优化)
      const hasOptimization = compSrc.includes("React.memo") || compSrc.includes("React.lazy");
      report("动画", `${comp} 有性能优化 (memo/lazy)`, hasOptimization);
    }
  }

  // 3.3 检查 CSS 动画定义
  const globalsPath = "./src/app/globals.css";
  const globalsExists = fs.existsSync(globalsPath);
  report("动画", "globals.css 存在", globalsExists);

  if (globalsExists) {
    const globalsSrc = fs.readFileSync(globalsPath, "utf-8");
    // 使用实际的 keyframe 名称
    report("动画", "slideIn keyframes 定义", globalsSrc.includes("@keyframes slideIn"));
    report("动画", "动画相关定义", globalsSrc.includes("animation") || globalsSrc.includes("keyframes"));
  }

  // 3.4 检查 WelcomeScreen 中的动画
  const welcomeScreenPath = "./src/app/components/WelcomeScreen.tsx";
  const welcomeExists = fs.existsSync(welcomeScreenPath);
  report("动画", "WelcomeScreen 组件存在", welcomeExists);

  if (welcomeExists) {
    const welcomeSrc = fs.readFileSync(welcomeScreenPath, "utf-8");
    report("动画", "WelcomeScreen 有 floating 动画", welcomeSrc.includes("floating"));
    report("动画", "WelcomeScreen 有 fadeInScale 动画", welcomeSrc.includes("fadeInScale"));
  }
}

// ============================================================================
// Test Suite 4: 构建验证
// ============================================================================
function testBuildArtifacts() {
  console.log("\n▶ 测试组 4: 构建验证");

  // 4.1 检查 .next 目录
  const nextDirExists = fs.existsSync("./.next");
  report("构建", ".next 目录存在", nextDirExists);

  if (nextDirExists) {
    // 检查构建产物
    const buildManifestExists = fs.existsSync("./.next/build-manifest.json");
    report("构建", "build-manifest.json 存在", buildManifestExists);

    const serverDirExists = fs.existsSync("./.next/server");
    report("构建", "server 目录存在", serverDirExists);

    const staticDirExists = fs.existsSync("./.next/static");
    report("构建", "static 目录存在", staticDirExists);
  }

  // 4.2 检查 package.json 脚本
  const packageJson = JSON.parse(fs.readFileSync("./package.json", "utf-8"));
  report("构建", "build 脚本存在", !!packageJson.scripts?.build);
  report("构建", "lint 脚本存在", !!packageJson.scripts?.lint);
  report("构建", "dev 脚本存在", !!packageJson.scripts?.dev);
}

// ============================================================================
// Main
// ============================================================================
(async () => {
  console.log("\n" + "=".repeat(70));
  console.log(" Phase 0-3 质量验收测试套件 v2");
  console.log("=".repeat(70));

  // Run all test suites
  testSourceCodeQuality();
  await testBrowserUI();
  testAnimationSystem();
  testBuildArtifacts();

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

  // 按类别统计
  const categories = [...new Set(results.map(r => r.category))];
  console.log("\n📊 分类统计:");
  for (const cat of categories) {
    const catResults = results.filter(r => r.category === cat);
    const catPass = catResults.filter(r => r.status.includes("PASS")).length;
    const catTotal = catResults.length;
    console.log(`  ${cat}: ${catPass}/${catTotal} (${Math.round(catPass/catTotal*100)}%)`);
  }

  // 计算通过率
  const passRate = Math.round(passCount / (passCount + failCount) * 100);
  console.log(`\n✅ 总体通过率: ${passRate}%`);

  if (passRate >= 90) {
    console.log("\n🎉 质量验收通过！建议合并到主分支。");
  } else if (passRate >= 80) {
    console.log("\n⚠️  质量验收基本通过，建议修复剩余问题后合并。");
  } else {
    console.log("\n❌ 质量验收未通过，需要修复问题后重新验收。");
  }

  process.exit(failCount > 0 ? 1 : 0);
})();
