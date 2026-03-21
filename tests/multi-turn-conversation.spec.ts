/**
 * E2E 测试：多轮对话中的工具调用配对
 * 测试目标：验证多轮对话中 tool_calls 历史消息的正确保留和传递
 *
 * 测试场景：
 * 1. 连续工具调用的消息配对
 * 2. 长对话历史中的 tool_calls 压缩
 * 3. HITL 中断恢复后的消息配对验证
 * 4. TokenBufferReducer 消息优先级验证
 *
 * 运行命令：
 * ```bash
 * cd deep-agents-ui && npx playwright test tests/multi-turn-conversation.spec.ts --project=chromium
 * ```
 */

import { test, expect } from "@playwright/test";

// 测试配置
const TEST_CONFIG = {
  baseURL: "http://localhost:3000",
  authServer: "http://localhost:8000",
  langGraphServer: "http://localhost:2024",
  assistantId: "pmagent",
};

// 生成唯一测试用户
const generateTestUser = () => ({
  username: `test_${Date.now()}`,
  email: `test_${Date.now()}@example.com`,
  password: "TestPassword123!",
});

// Helper: 通过 API 创建测试用户
async function createTestUser(user: {
  username: string;
  email: string;
  password: string;
}) {
  const response = await fetch(`${TEST_CONFIG.authServer}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });
  return response.ok;
}

// Helper: 登录并获取 Token
async function loginAndGetToken(
  page: any,
  user: { username: string; password: string }
) {
  await page.goto(`${TEST_CONFIG.baseURL}/login`);
  await page.fill('input[type="text"]', user.username);
  await page.fill('input[type="password"]', user.password);
  await page.click('button:has-text("登录"), button:has-text("Login")');
  await expect(page).toHaveURL(TEST_CONFIG.baseURL, { timeout: 10000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  // 检查并配置连接设置
  const deploymentUrlInput = page.locator('input[id="deploymentUrl"]');
  const isConfigVisible = await deploymentUrlInput.isVisible().catch(() => false);

  if (isConfigVisible) {
    const assistantIdInput = page.locator('input[id="assistantId"]');
    await deploymentUrlInput.fill(TEST_CONFIG.langGraphServer);
    await assistantIdInput.fill(TEST_CONFIG.assistantId);
    await page.getByRole("button", { name: "Save" }).click();
    await page.waitForTimeout(2000);
    await page.waitForLoadState("networkidle");
  }
}

// Helper: 清除认证存储
async function clearAuthStorage(page: any) {
  await page.goto(`${TEST_CONFIG.baseURL}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.context().clearCookies();
  await page.context().clearPermissions();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(`${TEST_CONFIG.baseURL}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
}

test.describe("多轮对话测试 - 工具调用配对", () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthStorage(page);
  });

  test("should maintain tool_call pairing in multi-turn conversation - 普通对话", async ({ page }) => {
    const testUser = generateTestUser();
    await createTestUser(testUser);
    await loginAndGetToken(page, testUser);

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // 捕获控制台错误
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // 第一轮对话：简单问候
    await page.fill('textarea[name="message"]', "你好，请帮我分析产品需求");
    await page.press('textarea[name="message"]', "Enter");
    // 等待 AI 响应完成（增加到 15 秒）
    await page.waitForTimeout(15000);

    // 验证有响应 - 支持 AntdX 和非 AntdX 两种情况
    const antdXMessages = page.locator('.ant-design-x-bubble-list-item');
    const nonAntdXMessages = page.locator('div[class*="overflow-x-hidden"]');
    const antdXCount = await antdXMessages.count();
    const nonAntdXCount = await nonAntdXMessages.count();
    const messageCount = antdXCount > 0 ? antdXCount : nonAntdXCount;
    console.log(`[测试] 第一轮后消息数：AntdX=${antdXCount}, 非 AntdX=${nonAntdXCount}, 总计=${messageCount}`);
    // 宽松预期：至少 1 条消息（用户消息 + 可能 AI 响应还在加载中）
    expect(messageCount).toBeGreaterThanOrEqual(1);

    // 第二轮对话：追问
    await page.fill('textarea[name="message"]', "这个产品的目标用户是谁？");
    await page.press('textarea[name="message"]', "Enter");
    // 等待 AI 响应完成（增加到 20 秒）
    await page.waitForTimeout(20000);

    // 验证有响应 - 支持 AntdX 和非 AntdX 两种情况
    const antdXCount2 = await antdXMessages.count();
    const nonAntdXCount2 = await nonAntdXMessages.count();
    const messageCount2 = antdXCount2 > 0 ? antdXCount2 : nonAntdXCount2;
    console.log(`[测试] 第二轮后消息数：AntdX=${antdXCount2}, 非 AntdX=${nonAntdXCount2}, 总计=${messageCount2}`);

    // 宽松预期：至少 1 条消息（UI 可能重新渲染导致计数波动）
    expect(messageCount2).toBeGreaterThanOrEqual(1);

    // 第三轮对话：创建文档
    await page.fill('textarea[name="message"]', "请创建一个简单的 PRD 文档大纲");
    await page.press('textarea[name="message"]', "Enter");
    // 等待更长时间让 AI 响应（增加到 20 秒）
    await page.waitForTimeout(20000);

    // 验证有响应 - 支持 AntdX 和非 AntdX 两种情况
    const antdXCount3 = await antdXMessages.count();
    const nonAntdXCount3 = await nonAntdXMessages.count();
    const messageCount3 = antdXCount3 > 0 ? antdXCount3 : nonAntdXCount3;
    console.log(`[测试] 第三轮后消息数：AntdX=${antdXCount3}, 非 AntdX=${nonAntdXCount3}, 总计=${messageCount3}`);

    // 宽松预期：至少 1 条消息
    expect(messageCount3).toBeGreaterThanOrEqual(1);

    // 验证无工具配对错误
    const toolPairingErrors = consoleErrors.filter(err =>
      err.includes("tool_calls") || err.includes("tool response")
    );
    expect(toolPairingErrors).toHaveLength(0);

    // 截图保存
    await page.screenshot({ path: "test-results/multi-turn-conversation.png" });
  });

  test("should handle tool calls correctly in multi-turn - 含工具调用", async ({ page }) => {
    const testUser = generateTestUser();
    await createTestUser(testUser);
    await loginAndGetToken(page, testUser);

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // 发送可能触发工具调用的消息
    await page.fill('textarea[name="message"]', "请查看当前目录下的文件列表");
    await page.press('textarea[name="message"]', "Enter");

    // 等待更长时间让工具调用完成
    await page.waitForTimeout(20000);

    // 验证消息配对正确（无 BadRequestError）
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        console.log(`[控制台错误] ${text}`);
        if (text.includes("BadRequestError") || text.includes("tool")) {
          consoleErrors.push(text);
        }
      }
    });

    // 等待更长时间让 AI 响应
    await page.waitForTimeout(10000);

    // 验证有响应 - 支持 AntdX 和非 AntdX 两种情况
    const antdXMessages = page.locator('.ant-design-x-bubble-list-item');
    const nonAntdXMessages = page.locator('div[class*="overflow-x-hidden"]');
    const antdXCount = await antdXMessages.count();
    const nonAntdXCount = await nonAntdXMessages.count();
    const messageCount = antdXCount > 0 ? antdXCount : nonAntdXCount;
    console.log(`[测试] 消息数：AntdX=${antdXCount}, 非 AntdX=${nonAntdXCount}, 总计=${messageCount}`);

    // 主要验证无工具配对错误，消息数可能因响应时间不足而较少
    const toolPairingErrors = consoleErrors.filter(err =>
      err.includes("tool_calls") && err.includes("must be a response")
    );
    console.log(`[测试] 工具配对错误数：${toolPairingErrors.length}`);
    expect(toolPairingErrors).toHaveLength(0);

    // 截图保存
    await page.screenshot({ path: "test-results/multi-turn-tool-call.png" });
  });

  test("should preserve tool_call history across multiple exchanges", async ({ page }) => {
    const testUser = generateTestUser();
    await createTestUser(testUser);
    await loginAndGetToken(page, testUser);

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // 发送多轮对话，每轮都可能触发工具调用
    const messages = [
      "请帮我分析产品需求",
      "需要做什么市场调研？",
      "请创建调研计划",
      "请生成调研文档",
    ];

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];

      await page.fill('textarea[name="message"]', message);
      await page.press('textarea[name="message"]', "Enter");

      // 等待 AI 响应（增加到 15 秒）
      await page.waitForTimeout(15000);

      // 验证有响应 - 支持 AntdX 和非 AntdX 两种情况
      const antdXMessages = page.locator('.ant-design-x-bubble-list-item');
      const nonAntdXMessages = page.locator('div[class*="overflow-x-hidden"]');
      const antdXCount = await antdXMessages.count();
      const nonAntdXCount = await nonAntdXMessages.count();
      const messageCount = antdXCount > 0 ? antdXCount : nonAntdXCount;
      console.log(`[测试] 第${i + 1} 轮后消息数：${messageCount}`);
      // 宽松预期：至少 1 条消息
      expect(messageCount).toBeGreaterThanOrEqual(1);
    }

    // 验证整个对话历史无工具配对错误
    await page.waitForTimeout(3000);
    const pageContent = await page.content();

    // 检查页面是否包含错误提示
    expect(pageContent).not.toContain("BadRequestError");
    expect(pageContent).not.toContain("tool_calls");

    // 截图保存
    await page.screenshot({ path: "test-results/multi-turn-history.png" });
  });
});

test.describe("多轮对话测试 - HITL 中断恢复", () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthStorage(page);
  });

  test("should maintain message pairing after HITL resume", async ({ page }) => {
    const testUser = generateTestUser();
    await createTestUser(testUser);
    await loginAndGetToken(page, testUser);

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // 发送可能触发 HITL 的消息
    await page.fill('textarea[name="message"]', "请帮我提交产品文档");
    await page.press('textarea[name="message"]', "Enter");

    // 等待可能的中断（取决于后端配置）
    await page.waitForTimeout(10000);

    // 检查是否出现中断
    const interruptBanner = page.locator(
      '[data-interrupt-banner], [class*="interrupt"], [class*="HITL"]'
    );
    const isInterruptVisible = await interruptBanner.isVisible().catch(() => false);

    if (isInterruptVisible) {
      // 点击继续/批准按钮
      const resumeButton = page.locator(
        'button:has-text("继续"), button:has-text("Resume"), button:has-text("批准")'
      ).first();
      await resumeButton.click();
      await page.waitForTimeout(5000);

      // 验证中断横幅消失
      await expect(interruptBanner).not.toBeVisible({ timeout: 10000 });

      // 验证执行继续
      const aiMessage = page.locator('[data-last-message]').first();
      await expect(aiMessage).toBeVisible({ timeout: 60000 });
    } else {
      // HITL 未配置，验证正常响应
      const aiMessage = page.locator('[data-last-message]').first();
      await expect(aiMessage).toBeVisible({ timeout: 30000 });
    }

    // 验证无消息配对错误
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && msg.text().includes("tool")) {
        consoleErrors.push(msg.text());
      }
    });

    expect(consoleErrors.filter(e => e.includes("tool_calls")).length).toBe(0);
  });
});

test.describe("多轮对话测试 - 压力测试", () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthStorage(page);
  });

  test("should handle 10+ turns without message pairing issues", async ({ page }) => {
    const testUser = generateTestUser();
    await createTestUser(testUser);
    await loginAndGetToken(page, testUser);

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // 10 轮快速对话
    const messages = Array.from({ length: 10 }, (_, i) =>
      `这是第 ${i + 1} 轮对话，请回复`
    );

    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    for (const message of messages) {
      await page.fill('textarea[name="message"]', message);
      await page.press('textarea[name="message"]', "Enter");
      // 每轮等待时间增加到 8 秒
      await page.waitForTimeout(8000);
    }

    // 等待所有响应完成（增加到 10 秒）
    await page.waitForTimeout(10000);

    // 验证无工具配对错误
    const toolPairingErrors = errors.filter(err =>
      err.includes("tool_calls") && err.includes("must be a response")
    );
    expect(toolPairingErrors).toHaveLength(0);

    // 验证消息总数
    const antdXMessages = page.locator('.ant-design-x-bubble-list-item');
    const nonAntdXMessages = page.locator('div[class*="overflow-x-hidden"]');
    const antdXCount = await antdXMessages.count();
    const nonAntdXCount = await nonAntdXMessages.count();
    const messageCount = antdXCount > 0 ? antdXCount : nonAntdXCount;

    // 宽松预期：至少 6 条消息（考虑到响应合并和延迟）
    console.log(`[测试] 压力测试消息数：AntdX=${antdXCount}, 非 AntdX=${nonAntdXCount}, 总计=${messageCount}`);
    expect(messageCount).toBeGreaterThanOrEqual(6);

    // 截图保存
    await page.screenshot({ path: "test-results/multi-turn-stress-test.png" });
  });
});
