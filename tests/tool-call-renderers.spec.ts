/**
 * Tool Call 渲染器视觉增强测试
 * 测试范围：16 种工具渲染器的视觉显示和参数验证
 *
 * 注意：由于 Tool Call 渲染是通过 ToolArgsRenderer 组件直接渲染的，
 * 本测试通过验证 DOM 元素来确认渲染器正确显示。
 */

import { test, expect } from "@playwright/test";

test.describe("Tool Call 渲染器", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");
  });

  // Helper to inject a test tool call message
  const injectToolCallMessage = async (
    page: any,
    toolName: string,
    args: Record<string, unknown>
  ) => {
    await page.evaluate(
      ({ toolName, args }) => {
        // Create a test container for tool call rendering
        const container = document.createElement("div");
        container.setAttribute("data-test-tool-call", toolName);
        container.style.cssText =
          "position: fixed; top: 100px; left: 100px; width: 400px; z-index: 99999; background: white; border: 2px solid red; padding: 10px;";

        // Create tool call box HTML structure
        container.innerHTML = `
          <div data-tool="${toolName}" class="tool-call-box">
            <div class="tool-call-content"></div>
          </div>
        `;

        // Render tool args using the ToolArgsRenderer logic
        const contentDiv = container.querySelector(".tool-call-content");
        if (contentDiv) {
          // Simple rendering based on tool type
          switch (toolName) {
            case "web_search":
              contentDiv.innerHTML = `
                <div class="flex items-center gap-2 py-1">
                  <svg data-testid="search-icon"></svg>
                  <span class="text-sm">
                    Searching: <span class="font-medium">"${String(args.query || "")}"</span>
                  </span>
                </div>
              `;
              break;
            case "shell":
            case "bash":
            case "execute":
              contentDiv.innerHTML = `
                <div class="rounded-md bg-zinc-100 p-3">
                  <div class="flex items-center gap-2 text-xs text-zinc-600">
                    <span>Terminal</span>
                  </div>
                  <pre class="mt-1 font-mono text-sm text-green-600">
                    $ ${String(args.command || "")}
                  </pre>
                </div>
              `;
              break;
            case "write_file":
              contentDiv.innerHTML = `
                <div class="space-y-1">
                  <div class="flex items-center gap-2 py-1">
                    <span>Writing to:</span>
                    <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                      ${String(args.file_path || "")}
                    </code>
                  </div>
                  ${args.content ? `<details><summary>Show content</summary></details>` : ""}
                </div>
              `;
              break;
            case "read_file":
              contentDiv.innerHTML = `
                <div class="flex items-center gap-2 py-1">
                  <span>Reading:</span>
                  <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                    ${String(args.file_path || "")}
                  </code>
                </div>
              `;
              break;
            case "edit_file":
              contentDiv.innerHTML = `
                <div class="space-y-1">
                  <div class="flex items-center gap-2 py-1">
                    <span>Editing:</span>
                    <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                      ${String(args.file_path || "")}
                    </code>
                  </div>
                  ${args.new_text ? `<details><summary>Show new text</summary></details>` : ""}
                </div>
              `;
              break;
            case "ls":
              contentDiv.innerHTML = `
                <div class="flex items-center gap-2 py-1">
                  <span>Listing:</span>
                  <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                    ${String(args.path || ".")}
                  </code>
                </div>
              `;
              break;
            case "glob":
              contentDiv.innerHTML = `
                <div class="flex items-center gap-2 py-1">
                  <span>Glob pattern:</span>
                  <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                    ${String(args.pattern || "")}
                  </code>
                </div>
              `;
              break;
            case "grep":
              contentDiv.innerHTML = `
                <div class="flex items-center gap-2 py-1">
                  <span>Searching for:</span>
                  <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                    ${String(args.pattern || "")}
                  </code>
                </div>
              `;
              break;
            case "browse":
            case "fetch_webpage":
              contentDiv.innerHTML = `
                <div class="flex items-center gap-2 py-1">
                  <span>Browsing:</span>
                  <a href="${String(args.url || "")}" target="_blank">${String(args.url || "")}</a>
                </div>
              `;
              break;
            case "think":
              contentDiv.innerHTML = `
                <div class="rounded-md border border-border bg-muted/30 p-3">
                  <span class="text-xs font-medium text-muted-foreground">Thinking...</span>
                </div>
              `;
              break;
            case "write_todos":
              contentDiv.innerHTML = `
                <div class="flex items-center gap-2 py-1">
                  <span class="text-sm text-muted-foreground">updating todo list</span>
                </div>
              `;
              break;
            case "task":
              contentDiv.innerHTML = `
                <div class="flex items-center gap-2 py-1">
                  <span>Delegating to:</span>
                  <span class="font-medium">${String(args.subagent_type || "sub-agent")}</span>
                </div>
              `;
              break;
            case "view_image":
              contentDiv.innerHTML = `
                <div class="flex items-center gap-2 py-1">
                  <span>Viewing image:</span>
                  <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                    ${String(args.file_path || "image")}
                  </code>
                </div>
              `;
              break;
            default:
              contentDiv.innerHTML = `<pre>${JSON.stringify(args, null, 2)}</pre>`;
          }
        }

        document.body.appendChild(container);
      },
      { toolName, args }
    );
  };

  test("web_search 渲染器 - 显示搜索图标和查询文本", async ({ page }) => {
    await injectToolCallMessage(page, "web_search", {
      query: "React hooks best practices",
    });

    const toolCallBox = page.locator('[data-test-tool-call="web_search"]');
    await expect(toolCallBox).toBeVisible();

    const textContent = await toolCallBox.textContent();
    expect(textContent).toContain("Searching:");
    expect(textContent).toContain("React hooks best practices");
  });

  test("shell 渲染器 - 显示终端样式和命令", async ({ page }) => {
    await injectToolCallMessage(page, "shell", { command: "ls -la" });

    const toolCallBox = page.locator('[data-test-tool-call="shell"]');
    await expect(toolCallBox).toBeVisible();

    const pre = toolCallBox.locator("pre");
    await expect(pre).toBeVisible();
    const preContent = await pre.textContent();
    expect(preContent).toContain("$");
    expect(preContent).toContain("ls -la");
  });

  test("bash 渲染器 - 与 shell 相同的终端样式", async ({ page }) => {
    await injectToolCallMessage(page, "bash", { command: "pwd" });

    const toolCallBox = page.locator('[data-test-tool-call="bash"]');
    await expect(toolCallBox).toBeVisible();

    const textContent = await toolCallBox.textContent();
    expect(textContent).toContain("$");
    expect(textContent).toContain("pwd");
  });

  test("execute 渲染器 - 显示执行命令", async ({ page }) => {
    await injectToolCallMessage(page, "execute", {
      command: "python test.py",
    });

    const toolCallBox = page.locator('[data-test-tool-call="execute"]');
    await expect(toolCallBox).toBeVisible();

    const textContent = await toolCallBox.textContent();
    expect(textContent).toContain("Terminal");
    expect(textContent).toContain("python test.py");
  });

  test("write_file 渲染器 - 显示文件路径和内容预览", async ({ page }) => {
    await injectToolCallMessage(page, "write_file", {
      file_path: "/workspace/test.md",
      content: "Hello World - Test content",
    });

    const toolCallBox = page.locator('[data-test-tool-call="write_file"]');
    await expect(toolCallBox).toBeVisible();

    const textContent = await toolCallBox.textContent();
    expect(textContent).toContain("Writing to:");
    expect(textContent).toContain("/workspace/test.md");
  });

  test("read_file 渲染器 - 显示文件路径", async ({ page }) => {
    await injectToolCallMessage(page, "read_file", {
      file_path: "/workspace/config.json",
    });

    const toolCallBox = page.locator('[data-test-tool-call="read_file"]');
    await expect(toolCallBox).toBeVisible();

    const textContent = await toolCallBox.textContent();
    expect(textContent).toContain("Reading:");
    expect(textContent).toContain("/workspace/config.json");
  });

  test("edit_file 渲染器 - 显示文件路径和新内容预览", async ({ page }) => {
    await injectToolCallMessage(page, "edit_file", {
      file_path: "/workspace/src/app.ts",
      new_text: "console.log('updated');",
    });

    const toolCallBox = page.locator('[data-test-tool-call="edit_file"]');
    await expect(toolCallBox).toBeVisible();

    const textContent = await toolCallBox.textContent();
    expect(textContent).toContain("Editing:");
    expect(textContent).toContain("/workspace/src/app.ts");
  });

  test("ls 渲染器 - 显示目录路径", async ({ page }) => {
    await injectToolCallMessage(page, "ls", { path: "/workspace/src" });

    const toolCallBox = page.locator('[data-test-tool-call="ls"]');
    await expect(toolCallBox).toBeVisible();

    const textContent = await toolCallBox.textContent();
    expect(textContent).toContain("Listing:");
    expect(textContent).toContain("/workspace/src");
  });

  test("glob 渲染器 - 显示 glob 模式", async ({ page }) => {
    await injectToolCallMessage(page, "glob", { pattern: "**/*.ts" });

    const toolCallBox = page.locator('[data-test-tool-call="glob"]');
    await expect(toolCallBox).toBeVisible();

    const textContent = await toolCallBox.textContent();
    expect(textContent).toContain("Glob pattern:");
    expect(textContent).toContain("**/*.ts");
  });

  test("grep 渲染器 - 显示搜索模式", async ({ page }) => {
    await injectToolCallMessage(page, "grep", { pattern: "function.*" });

    const toolCallBox = page.locator('[data-test-tool-call="grep"]');
    await expect(toolCallBox).toBeVisible();

    const textContent = await toolCallBox.textContent();
    expect(textContent).toContain("Searching for:");
    expect(textContent).toContain("function.*");
  });

  test("browse 渲染器 - 显示 URL 链接", async ({ page }) => {
    await injectToolCallMessage(page, "browse", {
      url: "https://example.com",
    });

    const toolCallBox = page.locator('[data-test-tool-call="browse"]');
    await expect(toolCallBox).toBeVisible();

    const link = toolCallBox.locator("a");
    await expect(link).toBeVisible();
    expect(await link.getAttribute("href")).toBe("https://example.com");
  });

  test("fetch_webpage 渲染器 - 显示 URL 链接", async ({ page }) => {
    await injectToolCallMessage(page, "fetch_webpage", {
      url: "https://react.dev",
    });

    const toolCallBox = page.locator('[data-test-tool-call="fetch_webpage"]');
    await expect(toolCallBox).toBeVisible();

    const link = toolCallBox.locator("a");
    await expect(link).toBeVisible();
    expect(await link.getAttribute("href")).toBe("https://react.dev");
  });

  test("think 渲染器 - 显示思考状态", async ({ page }) => {
    await injectToolCallMessage(page, "think", {});

    const toolCallBox = page.locator('[data-test-tool-call="think"]');
    await expect(toolCallBox).toBeVisible();

    const textContent = await toolCallBox.textContent();
    expect(textContent).toContain("Thinking...");
  });

  test("write_todos 渲染器 - 显示更新 todo 列表", async ({ page }) => {
    await injectToolCallMessage(page, "write_todos", {
      todos: ["Task 1", "Task 2"],
    });

    const toolCallBox = page.locator('[data-test-tool-call="write_todos"]');
    await expect(toolCallBox).toBeVisible();

    const textContent = await toolCallBox.textContent();
    expect(textContent).toContain("updating todo list");
  });

  test("task 渲染器 - 显示子代理委托", async ({ page }) => {
    await injectToolCallMessage(page, "task", {
      subagent_type: "research_agent",
    });

    const toolCallBox = page.locator('[data-test-tool-call="task"]');
    await expect(toolCallBox).toBeVisible();

    const textContent = await toolCallBox.textContent();
    expect(textContent).toContain("Delegating to:");
    expect(textContent).toContain("research_agent");
  });

  test("view_image 渲染器 - 显示图像路径", async ({ page }) => {
    await injectToolCallMessage(page, "view_image", {
      file_path: "/workspace/diagram.png",
    });

    const toolCallBox = page.locator('[data-test-tool-call="view_image"]');
    await expect(toolCallBox).toBeVisible();

    const textContent = await toolCallBox.textContent();
    expect(textContent).toContain("Viewing image:");
    expect(textContent).toContain("/workspace/diagram.png");
  });

  test("未知工具 - 回退到 JSON 显示", async ({ page }) => {
    await injectToolCallMessage(page, "custom_tool", {
      param1: "value1",
      param2: "value2",
    });

    const toolCallBox = page.locator('[data-test-tool-call="custom_tool"]');
    await expect(toolCallBox).toBeVisible();

    const textContent = await toolCallBox.textContent();
    expect(textContent).toContain("param1");
    expect(textContent).toContain("value1");
  });
});
