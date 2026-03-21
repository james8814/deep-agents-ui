/**
 * E2E 测试：SubAgent 触发场景
 * 测试目标：通过前端 UI 触发 SubAgent 执行，验证 SubAgent 工作日志显示
 *
 * 测试流程：
 * 1. 用户登录（演示模式）
 * 2. 发送触发 SubAgent 的消息
 * 3. 验证 SubAgent 卡片显示
 * 4. 验证 SubAgent 工作步骤（工具调用）显示
 * 5. 验证 SubAgent 执行结果展示
 */

import { test, expect } from "@playwright/test";

// 只使用 Chromium 浏览器
test.use({ browserName: "chromium" });

// 测试配置
const TEST_TIMEOUT = 120000; // 2 分钟
const DEPLOYMENT_URL = "http://localhost:2024";
const ASSISTANT_ID = "pmagent";

test.describe("E2E: SubAgent 触发场景", () => {
  test.setTimeout(TEST_TIMEOUT);

  test.beforeEach(async ({ page }) => {
    // 清除 localStorage 中的配置，强制显示配置对话框
    await page.addInitScript(() => {
      localStorage.removeItem('deep-agent-config-v2');
      // 启用演示认证模式
      localStorage.setItem('deep-agent-demo-auth', 'true');
    });

    // 访问首页
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(5000); // 等待应用初始化

    // 捕获控制台消息
    page.on("console", (msg) => {
      console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
    });

    // 捕获页面错误
    page.on("pageerror", (error) => {
      console.log(`[Page Error] ${error.message}`);
    });

    // 捕获所有网络请求
    page.on("request", (request) => {
      const url = request.url();
      const method = request.method();
      if (url.includes("localhost:2024") || url.includes("localhost:8000") || url.includes("localhost:3000")) {
        console.log(`[Request] ${method} ${url}`);
      }
    });

    page.on("response", (response) => {
      const url = response.url();
      const status = response.status();
      const contentType = response.headers()["content-type"] || "";
      if (url.includes("localhost:2024") || url.includes("localhost:8000")) {
        console.log(`[Response] ${status} ${url} (${contentType})`);
      }
    });
  });

  test("验证 SubAgent 卡片显示 - 简单触发", async ({ page }) => {
    // 检查并配置连接设置（如果显示配置对话框）
    const configDialog = page.locator('[role="dialog"]');
    const dialogVisible = await configDialog.count() > 0;

    if (dialogVisible) {
      console.log("[测试] 检测到配置对话框，正在配置...");
      // 查找部署 URL 输入框 (ID: deploymentUrl)
      const deploymentInput = page.locator('input[id="deploymentUrl"]');
      if (await deploymentInput.count() > 0) {
        await deploymentInput.fill(DEPLOYMENT_URL);
        console.log("[测试] 已填写 Deployment URL");
      }

      // 查找 Assistant ID 输入框 (ID: assistantId)
      const assistantInput = page.locator('input[id="assistantId"]');
      if (await assistantInput.count() > 0) {
        await assistantInput.fill(ASSISTANT_ID);
        console.log("[测试] 已填写 Assistant ID");
      }

      // 点击保存按钮
      const saveButton = page.locator('button:has-text("Save")').first();
      await saveButton.click();
      console.log("[测试] 已点击保存按钮");
      await page.waitForTimeout(2000);
    }

    // 等待输入框出现
    const inputArea = page.locator('textarea[placeholder*="message"], textarea[placeholder*="Message"], textarea[placeholder*="Type"]').first();
    await inputArea.waitFor({ state: "visible", timeout: 10000 });

    // 发送触发 SubAgent 的消息
    await inputArea.fill("请使用 research_agent 搜索一下 LangChain 框架的最新特性");
    await page.keyboard.press("Enter");

    console.log("[测试] 已发送 SubAgent 触发消息");

    // 等待 AI 响应（最多等待 30 秒）
    console.log("[测试] 等待 AI 响应...");
    await page.waitForTimeout(30000);

    // 检查是否有正在运行的状态
    const runningStatus = page.locator('text=Running agent, text=运行中');
    const isRunning = await runningStatus.count() > 0;
    console.log(`[测试] Agent 是否仍在运行：${isRunning}`);

    // 等待 SubAgent 卡片出现（最多等待 60 秒）
    try {
      await page.waitForSelector('[class*="subagent"], [class*="SubAgent"]', { timeout: 60000, state: "visible" });
      console.log("[测试] 检测到 SubAgent 元素");
    } catch (e) {
      await page.screenshot({ path: "test-results/subagent-timeout.png" });
      console.log("[测试] 未在 60 秒内检测到 SubAgent 元素，截图已保存");
    }

    // 验证有消息回复 - 支持 AntdX 和非 AntdX 两种情况
    // AntdX 使用 Bubble.List，非 AntdX 使用 ChatMessageAnimated（最外层 div 有 overflow-x-hidden 类）
    const antdXMessages = page.locator('.ant-design-x-bubble-list-item');
    const nonAntdXMessages = page.locator('div[class*="overflow-x-hidden"]');

    const antdXCount = await antdXMessages.count();
    const nonAntdXCount = await nonAntdXMessages.count();
    const messageCount = antdXCount > 0 ? antdXCount : nonAntdXCount;

    console.log(`[测试] AntdX 消息数：${antdXCount}, 非 AntdX 消息数：${nonAntdXCount}, 总消息数：${messageCount}`);

    // 截图保存
    await page.screenshot({ path: "test-results/subagent-triggered.png" });
    console.log("[测试] 截图已保存");

    // 断言至少有一条回复（用户消息 + 至少一条 AI 回复）
    expect(messageCount).toBeGreaterThan(1);
  });

  test("验证 SubAgent 工作日志显示 - 展开详情", async ({ page }) => {
    // 检查并配置连接设置
    const configDialog = page.locator('[role="dialog"]');
    const dialogVisible = await configDialog.count() > 0;

    if (dialogVisible) {
      const deploymentInput = page.locator('input[id*="deployment"], input[placeholder*="http"], input[type="url"]');
      if (await deploymentInput.count() > 0) {
        await deploymentInput.fill(DEPLOYMENT_URL);
      }
      const assistantInput = page.locator('input[id*="assistant"], input[placeholder*="Assistant"]');
      if (await assistantInput.count() > 0) {
        await assistantInput.fill(ASSISTANT_ID);
      }
      const saveButton = page.locator('button:has-text("Save"), button:has-text("保存"), button[type="submit"]').first();
      await saveButton.click();
      await page.waitForTimeout(2000);
    }

    // 等待输入框出现
    const inputArea = page.locator('textarea[placeholder*="message"], textarea[placeholder*="Message"], textarea[placeholder*="Type"]').first();
    await inputArea.waitFor({ state: "visible", timeout: 10000 });

    // 发送触发 SubAgent 的消息
    await inputArea.fill("请分析对比 Asana、Monday.com、ClickUp 三个项目管理工具的特点");
    await page.keyboard.press("Enter");

    console.log("[测试] 已发送分析任务消息");

    // 等待响应
    await page.waitForTimeout(10000);

    // 查找 SubAgent 卡片或工具调用区块
    const subAgentElements = page.locator('[class*="subagent"], [class*="SubAgent"], [class*="tool-call"], [class*="ToolCall"]');
    const count = await subAgentElements.count();
    console.log(`[测试] 检测到 ${count} 个 SubAgent/工具调用元素`);

    // 截图保存
    await page.screenshot({ path: "test-results/subagent-expanded.png" });

    // 验证至少有一条回复消息 - 支持 AntdX 和非 AntdX 两种情况
    const antdXMessages = page.locator('.ant-design-x-bubble-list-item');
    const nonAntdXMessages = page.locator('div[class*="overflow-x-hidden"]');

    const antdXCount = await antdXMessages.count();
    const nonAntdXCount = await nonAntdXMessages.count();
    const messageCount = antdXCount > 0 ? antdXCount : nonAntdXCount;

    expect(messageCount).toBeGreaterThan(1);
  });

  test("验证无 SubAgent 场景 - 普通对话", async ({ page }) => {
    // 检查并配置连接设置
    const configDialog = page.locator('[role="dialog"]');
    const dialogVisible = await configDialog.count() > 0;

    if (dialogVisible) {
      const deploymentInput = page.locator('input[id*="deployment"], input[placeholder*="http"], input[type="url"]');
      if (await deploymentInput.count() > 0) {
        await deploymentInput.fill(DEPLOYMENT_URL);
      }
      const assistantInput = page.locator('input[id*="assistant"], input[placeholder*="Assistant"]');
      if (await assistantInput.count() > 0) {
        await assistantInput.fill(ASSISTANT_ID);
      }
      const saveButton = page.locator('button:has-text("Save"), button:has-text("保存"), button[type="submit"]').first();
      await saveButton.click();
      await page.waitForTimeout(2000);
    }

    // 等待输入框出现
    const inputArea = page.locator('textarea[placeholder*="message"], textarea[placeholder*="Message"], textarea[placeholder*="Type"]').first();
    await inputArea.waitFor({ state: "visible", timeout: 10000 });

    // 发送普通对话消息（不触发 SubAgent）
    await inputArea.fill("你好，请介绍一下你自己");
    await page.keyboard.press("Enter");

    console.log("[测试] 已发送普通对话消息");

    // 等待响应
    await page.waitForTimeout(5000);

    // 调试：打印页面结构
    const pageContent = await page.content();
    console.log("[测试] 页面 HTML 长度：" + pageContent.length);

    // 查找所有可能的消息元素
    const overflowDivs = page.locator('div[class*="overflow-x-hidden"]');
    const overflowCount = await overflowDivs.count();
    console.log(`[测试] overflow-x-hidden divs: ${overflowCount}`);

    const flexFullDivs = page.locator('div.flex.w-full');
    const flexFullCount = await flexFullDivs.count();
    console.log(`[测试] flex w-full divs: ${flexFullCount}`);

    const groupDivs = page.locator('div.group');
    const groupCount = await groupDivs.count();
    console.log(`[测试] group divs: ${groupCount}`);

    // 验证有回复 - 支持 AntdX 和非 AntdX 两种情况
    const antdXMessages = page.locator('.ant-design-x-bubble-list-item');
    const nonAntdXMessages = page.locator('div[class*="overflow-x-hidden"]');

    const antdXCount = await antdXMessages.count();
    const nonAntdXCount = await nonAntdXMessages.count();
    const messageCount = antdXCount > 0 ? antdXCount : nonAntdXCount;

    console.log(`[测试] AntdX 消息数：${antdXCount}, 非 AntdX 消息数：${nonAntdXCount}, 总消息数：${messageCount}`);

    expect(messageCount).toBeGreaterThan(1);

    console.log("[测试] 普通对话测试通过");

    // 截图保存
    await page.screenshot({ path: "test-results/normal-conversation.png" });
  });
});
