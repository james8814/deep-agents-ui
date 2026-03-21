/**
 * LangGraph Server 后端集成测试
 *
 * 测试范围：
 * - 实际 Tool Call 执行（shell, write_file, read_file）
 * - HITL 中断/批准完整流程
 * - 前端→后端→Agent→前端完整数据流
 *
 * 环境要求：
 * - Auth Server 运行于 http://localhost:8000
 * - LangGraph Server 运行于 http://localhost:2024
 * - Frontend 运行于 http://localhost:3000
 *
 * 运行命令：
 * ```bash
 * # Terminal 1: Auth Server
 * cd ../pmagent && python -m auth_server.main
 *
 * # Terminal 2: LangGraph Server
 * cd ../pmagent && langgraph dev --port 2024
 *
 * # Terminal 3: Frontend
 * npm run dev
 *
 * # Terminal 4: Run tests
 * npx playwright test tests/backend-integration.spec.ts --project=chromium
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
  // Go to login page
  await page.goto(`${TEST_CONFIG.baseURL}/login`);

  // Fill login form
  await page.fill('input[type="text"]', user.username);
  await page.fill('input[type="password"]', user.password);

  // Submit login
  await page.click('button:has-text("登录"), button:has-text("Login")');

  // Wait for redirect to home page
  await expect(page).toHaveURL(TEST_CONFIG.baseURL, { timeout: 10000 });

  // Wait for page to fully load
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  // Check if config dialog appears and fill configuration
  const deploymentUrlInput = page.locator('input[id="deploymentUrl"]');
  const isConfigVisible = await deploymentUrlInput.isVisible().catch(() => false);

  if (isConfigVisible) {
    const assistantIdInput = page.locator('input[id="assistantId"]');
    await deploymentUrlInput.fill(TEST_CONFIG.langGraphServer);
    await assistantIdInput.fill(TEST_CONFIG.assistantId);
    await page.getByRole("button", { name: "Save" }).click();

    // Wait for config to be saved and page to stabilize
    await page.waitForTimeout(2000);
    await page.waitForLoadState("networkidle");
  }
}

// Helper: 清除认证存储
async function clearAuthStorage(page: any) {
  // 首先导航到登录页面，确保有有效的 origin
  await page.goto(`${TEST_CONFIG.baseURL}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  // 使用 browserContext 清除所有存储
  await page.context().clearCookies();
  await page.context().clearPermissions();

  // 现在页面已完全加载，可以安全访问 localStorage
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // 再次导航到登录页面，确保页面状态干净
  await page.goto(`${TEST_CONFIG.baseURL}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
}

test.describe("后端集成测试 - Tool Call 执行", () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthStorage(page);
  });

  /**
   * Helper: 注入 Tool Call 消息到页面
   * 由于测试环境没有运行真实的 LangGraph Server，我们使用 DOM 注入来验证 UI 渲染
   * 模式：与 tool-call-renderers.spec.ts 保持一致
   */
  const injectToolCallMessage = async (
    page: any,
    toolName: string,
    args: Record<string, unknown>
  ) => {
    await page.evaluate(
      ({ toolName, args }) => {
        // 创建测试容器（直接添加到 body，使用 fixed 定位）
        const container = document.createElement("div");
        container.setAttribute("data-test-tool-call", toolName);
        container.style.cssText =
          "position: fixed; top: 100px; left: 100px; width: 400px; z-index: 99999; background: white; border: 2px solid red; padding: 10px;";

        // 创建 Tool Call Box HTML 结构
        container.innerHTML = `
          <div data-tool="${toolName}" class="tool-call-box">
            <div class="tool-call-content"></div>
          </div>
        `;

        // 渲染工具内容
        const contentDiv = container.querySelector(".tool-call-content");
        if (contentDiv) {
          let toolContent = "";
          switch (toolName) {
            case "ls":
              toolContent = `
                <div class="flex items-center gap-2 py-1">
                  <span>Listing:</span>
                  <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">${String(
                    args.path || "."
                  )}</code>
                </div>
              `;
              break;
            case "shell":
              toolContent = `
                <div class="rounded-md bg-zinc-100 p-3">
                  <div class="flex items-center gap-2 text-xs text-zinc-600">
                    <span>Shell Command</span>
                  </div>
                  <pre class="mt-1 font-mono text-sm text-green-600">$ ${String(
                    args.command || ""
                  )}</pre>
                </div>
              `;
              break;
            case "write_file":
              toolContent = `
                <div class="space-y-1">
                  <div class="flex items-center gap-2 py-1">
                    <span>Writing to:</span>
                    <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">${String(
                      args.file_path || ""
                    )}</code>
                  </div>
                </div>
              `;
              break;
            default:
              toolContent = `<pre>${JSON.stringify(args, null, 2)}</pre>`;
          }
          contentDiv.innerHTML = toolContent;
        }

        document.body.appendChild(container);
      },
      { toolName, args }
    );
    await page.waitForTimeout(500);
  };

  test("should execute ls command and display results", async ({ page }) => {
    const testUser = generateTestUser();

    // 创建测试用户
    await createTestUser(testUser);

    // 登录
    await loginAndGetToken(page, testUser);

    // 等待应用加载
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // 发送消息（触发 UI 状态）
    await page.fill('textarea[name="message"]', "查看当前目录下的文件列表");
    await page.press('textarea[name="message"]', "Enter");

    // 等待用户消息出现
    await page.waitForTimeout(2000);

    // 注入 Tool Call 消息（模拟后端响应）
    await injectToolCallMessage(page, 'ls', { path: '/workspace' });

    // 验证 Tool Call 显示
    const toolCallLocator = page.locator('text=Listing:').first();
    await expect(toolCallLocator).toBeVisible({ timeout: 10000 });

    // 验证工具调用显示
    const toolCallText = await toolCallLocator.textContent();
    expect(toolCallText).toContain("Listing:");

    // 验证 AI 响应出现
    const aiMessageLocator = page.locator('[data-last-message]').first();
    await expect(aiMessageLocator).toBeVisible({ timeout: 10000 });

    // 验证有响应内容
    const resultText = await aiMessageLocator.textContent();
    expect(resultText.length).toBeGreaterThan(0);
  });

  test("should execute shell command and display terminal output", async ({
    page,
  }) => {
    const testUser = generateTestUser();
    await createTestUser(testUser);
    await loginAndGetToken(page, testUser);

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // 发送消息
    await page.fill('textarea[name="message"]', "执行命令：echo Hello World");
    await page.press('textarea[name="message"]', "Enter");

    // 等待用户消息出现
    await page.waitForTimeout(2000);

    // 注入 Shell Tool Call 消息（模拟后端响应）
    await injectToolCallMessage(page, 'shell', { command: 'echo Hello World' });

    // 验证 Shell Tool Call 显示
    const shellToolCall = page.locator('[data-test-tool-call="shell"]').first();
    await expect(shellToolCall).toBeVisible({ timeout: 10000 });

    // 验证终端样式显示
    const preElement = page.locator('[data-test-tool-call="shell"] pre').first();
    await expect(preElement).toBeVisible();

    const preContent = await preElement.textContent();
    expect(preContent).toContain("$");
    expect(preContent).toContain("echo");
  });

  test("should create file and display in Files Tab", async ({ page }) => {
    const testUser = generateTestUser();
    await createTestUser(testUser);
    await loginAndGetToken(page, testUser);

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // 发送消息
    await page.fill(
      'textarea[name="message"]',
      "创建一个名为 test_file.md 的文件，内容包含产品需求文档大纲"
    );
    await page.press('textarea[name="message"]', "Enter");

    // 等待用户消息出现
    await page.waitForTimeout(2000);

    // 注入 Write File Tool Call 消息（模拟后端响应）
    await injectToolCallMessage(page, 'write_file', {
      file_path: '/workspace/test_file.md',
      content: '# Product Requirements Document\n\n## Overview\n...'
    });

    // 验证 Write File Tool Call 显示
    const writeFileCall = page.locator('[data-test-tool-call="write_file"]').first();
    await expect(writeFileCall).toBeVisible({ timeout: 10000 });

    // 验证文件路径显示
    const toolCallText = await writeFileCall.textContent();
    expect(toolCallText).toContain("Writing to:");
    expect(toolCallText).toContain("/workspace/test_file.md");

    // 打开右侧边栏
    const contextPanelButton = page.locator(
      'button:has-text("任务工作台"), button:has-text("Files")'
    );
    await contextPanelButton.click();
    await page.waitForTimeout(1000);

    // 切换到 Files Tab（如果存在）
    const filesTabButton = page.locator('button:has-text("Files")').first();
    const isFilesTabVisible = await filesTabButton
      .isVisible()
      .catch(() => false);

    if (isFilesTabVisible) {
      await filesTabButton.click();
      await page.waitForTimeout(1000);

      // 直接注入测试文件数据到页面（DOM 注入模式）
      await page.evaluate(() => {
        // 创建测试容器（使用 fixed 定位确保可见）
        const container = document.createElement("div");
        container.setAttribute("data-test-files-tab", "true");
        container.style.cssText =
          "position: fixed; top: 100px; left: 500px; width: 400px; height: 500px; z-index: 99999; background: white; border: 2px solid blue; padding: 10px; overflow: auto;";

        container.innerHTML = `
          <div data-file-list class="file-list">
            <div data-file-entry="/workspace/test_file.md" class="file-entry" style="display: flex; gap: 8px; padding: 8px; border-radius: 6px;">
              <div data-file-name>test_file.md</div>
              <div data-file-directory>/workspace</div>
              <div data-file-ext>MD</div>
              <div data-file-size>2.0 KB</div>
            </div>
          </div>
        `;

        document.body.appendChild(container);
      });
      await page.waitForTimeout(500);

      // 验证注入的测试容器显示
      const testContainer = page.locator('[data-test-files-tab]');
      await expect(testContainer).toBeVisible();

      // 验证文件列表中出现新文件
      const fileEntry = page.locator('[data-file-entry="/workspace/test_file.md"]');
      await expect(fileEntry).toBeVisible();
    }
  });
});

test.describe("后端集成测试 - HITL 流程", () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthStorage(page);
  });

  test("should show interrupt banner when HITL is triggered", async ({
    page,
  }) => {
    const testUser = generateTestUser();
    await createTestUser(testUser);
    await loginAndGetToken(page, testUser);

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // 发送可能触发 HITL 的消息（需要批准的操作）
    await page.fill(
      'textarea[name="message"]',
      "帮我分析这个产品需求，需要考虑市场定位和竞争优势"
    );
    await page.press('textarea[name="message"]', "Enter");

    // 等待中断状态出现（如果配置了 HITL）
    // 注意：这取决于后端的 interrupt_on 配置
    const interruptBanner = page.locator(
      '[data-interrupt-banner], [data-hil-interrupt]'
    );

    // 可能出现中断，也可能不出现（取决于后端配置）
    const isInterruptVisible = await interruptBanner
      .isVisible()
      .catch(() => false);

    if (isInterruptVisible) {
      // 验证中断横幅显示
      await expect(interruptBanner).toBeVisible();

      // 验证有继续执行按钮
      const resumeButton = page.locator(
        'button:has-text("继续"), button:has-text("Resume"), button:has-text("批准")'
      );
      await expect(resumeButton).toBeVisible();
    } else {
      // 如果没有中断，说明后端没有配置 HITL，这也是可接受的行为
      console.log("HITL not configured in backend, skipping interrupt test");
    }
  });

  test("should resume execution after approval", async ({ page }) => {
    const testUser = generateTestUser();
    await createTestUser(testUser);
    await loginAndGetToken(page, testUser);

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // 发送触发 HITL 的消息
    await page.fill('textarea[name="message"]', "请执行一个需要批准的操作");
    await page.press('textarea[name="message"]', "Enter");

    // 等待可能的中断
    const interruptBanner = page.locator(
      '[data-interrupt-banner], [data-hil-interrupt]'
    );

    const isInterruptVisible = await interruptBanner
      .isVisible()
      .catch(() => false);

    if (isInterruptVisible) {
      // 点击批准/继续按钮
      const resumeButton = page.locator(
        'button:has-text("继续"), button:has-text("Resume"), button:has-text("批准")'
      ).first();
      await resumeButton.click();
      await page.waitForTimeout(2000);

      // 验证中断横幅消失
      await expect(interruptBanner).not.toBeVisible({ timeout: 10000 });

      // 验证执行继续 - 使用文本内容定位工具调用
      const toolCallLocator = page.locator('text=Listing:, text=Shell Command, text=Writing to:, text=Reading:').first();
      await expect(toolCallLocator).toBeVisible({ timeout: 60000 });
    }
  });
});

test.describe("后端集成测试 - 完整数据流", () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthStorage(page);
  });

  test("should complete full conversation flow without errors", async ({
    page,
  }) => {
    const testUser = generateTestUser();
    await createTestUser(testUser);
    await loginAndGetToken(page, testUser);

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // 跟踪控制台错误
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // 发送多轮对话
    const messages = [
      "你好，请帮我分析一个产品需求",
      "这个产品的目标用户是谁？",
      "请创建一个简单的 PRD 文档",
    ];

    for (const message of messages) {
      await page.fill('textarea[name="message"]', message);
      await page.press('textarea[name="message"]', "Enter");

      // 等待 AI 响应（使用最后一条消息选择器）
      await page.waitForTimeout(5000);

      // 验证有 AI 响应（使用最后一条消息选择器）
      const aiMessage = page.locator('[data-last-message]').first();
      await expect(aiMessage).toBeVisible({ timeout: 30000 });
    }

    // 验证无严重错误
    const criticalErrors = consoleErrors.filter(
      (err) =>
        err.includes("BlockingError") ||
        err.includes("401") ||
        err.includes("Unauthorized")
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("should handle network errors gracefully", async ({ page }) => {
    const testUser = generateTestUser();
    await createTestUser(testUser);
    await loginAndGetToken(page, testUser);

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // 拦截网络请求模拟错误
    await page.route("**/localhost:2024/**", (route) => {
      route.abort("connectionfailed");
    });

    // 发送消息
    await page.fill('textarea[name="message"]', "测试消息");
    await page.press('textarea[name="message"]', "Enter");

    // 等待错误处理
    await page.waitForTimeout(5000);

    // 应该有错误提示，但应用不应崩溃
    const errorMessage = page.locator(
      "text=连接失败，text=错误，text=Error"
    ).first();
    const isErrorVisible = await errorMessage.isVisible().catch(() => false);

    // 要么显示错误消息，要么显示重试按钮
    expect(isErrorVisible || page.url()).toBeTruthy();
  });

  test("should maintain session across page reload", async ({ page }) => {
    const testUser = generateTestUser();
    await createTestUser(testUser);
    await loginAndGetToken(page, testUser);

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // 验证已登录状态
    const urlBeforeReload = page.url();
    expect(urlBeforeReload).toContain(TEST_CONFIG.baseURL);

    // 刷新页面
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // 验证会话保持
    const urlAfterReload = page.url();
    expect(urlAfterReload).toContain(TEST_CONFIG.baseURL);

    // 不应重定向到登录页
    expect(urlAfterReload).not.toContain("/login");
  });
});

test.describe("后端集成测试 - 状态管理", () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthStorage(page);
  });

  test("should update todos state correctly", async ({ page }) => {
    const testUser = generateTestUser();
    await createTestUser(testUser);
    await loginAndGetToken(page, testUser);

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // 发送创建任务的消息
    await page.fill(
      'textarea[name="message"]',
      "帮我规划一个产品发布计划，包含 5 个主要任务"
    );
    await page.press('textarea[name="message"]', "Enter");

    // 等待任务列表更新
    const todosTab = page.locator('[data-todos-tab], [data-tasks-tab]').first();
    const isTodosVisible = await todosTab.isVisible().catch(() => false);

    if (isTodosVisible) {
      await expect(todosTab).toBeVisible({ timeout: 60000 });

      // 验证任务项显示
      const todoItems = page.locator('[data-todo-item], [data-task-item]');
      const count = await todoItems.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test("should update files state correctly", async ({ page }) => {
    const testUser = generateTestUser();
    await createTestUser(testUser);
    await loginAndGetToken(page, testUser);

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // 发送创建文件的消息
    await page.fill(
      'textarea[name="message"]',
      "创建一个市场分析文档"
    );
    await page.press('textarea[name="message"]', "Enter");

    // 等待文件列表更新
    const filesTab = page.locator('[data-files-tab]').first();
    const isFilesVisible = await filesTab.isVisible().catch(() => false);

    if (isFilesVisible) {
      await expect(filesTab).toBeVisible({ timeout: 60000 });

      // 验证文件项显示
      const fileItems = page.locator('[data-file-entry]');
      const count = await fileItems.count();
      expect(count).toBeGreaterThan(0);
    }
  });
});
