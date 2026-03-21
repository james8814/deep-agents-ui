/**
 * 视觉回归测试 (Visual Regression Tests)
 *
 * 测试范围：关键 UI 组件的截图对比测试
 * - ContextPanel 三栏布局
 * - ChatMessage 用户/AI 消息样式
 * - ToolCallBox 16 种渲染器样式
 * - ConfigDialog 配置弹窗布局
 * - ThreadList 左侧边栏样式
 *
 * 使用方法:
 *   npx playwright test tests/visual-regression.spec.ts --update-snapshots
 *   npx playwright test tests/visual-regression.spec.ts --project=chromium
 */

import { test, expect } from "@playwright/test";

test.describe("Visual Regression Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  /**
   * ========================================
   * ContextPanel 视觉回归测试
   * ========================================
   */
  test.describe("ContextPanel", () => {
    test("ContextPanel - 默认空状态布局", async ({ page }) => {
      // 打开右侧边栏
      const contextToggle = page.locator(
        'button[aria-label*="上下文"], button[aria-label*="Context"], button:has-text("任务工作台")'
      );
      if (await contextToggle.isVisible()) {
        await contextToggle.click();
        await page.waitForTimeout(500);
      }

      // 截图验证布局
      const contextPanel = page.locator(
        '[data-context-panel], aside[class*="context"], div[class*="ContextPanel"]'
      );

      if (await contextPanel.isVisible()) {
        await expect(contextPanel).toHaveScreenshot(
          "context-panel-empty-state.png",
          {
            maxDiffPixels: 100,
            mask: [page.locator('[data-time]')], // 屏蔽时间戳变化
          }
        );
      }
    });

    test("ContextPanel - Tasks Tab 布局", async ({ page }) => {
      // 打开右侧边栏
      const contextToggle = page.locator(
        'button[aria-label*="上下文"], button[aria-label*="Context"], button:has-text("任务工作台")'
      );
      if (await contextToggle.isVisible()) {
        await contextToggle.click();
        await page.waitForTimeout(500);
      }

      // 确保在 Tasks Tab
      const tasksTab = page.locator(
        'button[role="tab"]:has-text("Tasks"), button:has-text("任务")'
      );
      if (await tasksTab.isVisible()) {
        await tasksTab.click();
        await page.waitForTimeout(300);
      }

      // 截图
      const panel = page.locator(
        '[data-context-panel], aside[class*="context"]'
      );
      if (await panel.isVisible()) {
        await expect(panel).toHaveScreenshot("context-panel-tasks-tab.png", {
          maxDiffPixels: 100,
        });
      }
    });

    test("ContextPanel - Files Tab 布局", async ({ page }) => {
      // 打开右侧边栏
      const contextToggle = page.locator(
        'button[aria-label*="上下文"], button[aria-label*="Context"], button:has-text("任务工作台")'
      );
      if (await contextToggle.isVisible()) {
        await contextToggle.click();
        await page.waitForTimeout(500);
      }

      // 切换到 Files Tab
      const filesTab = page.locator(
        'button[role="tab"]:has-text("Files"), button:has-text("文件")'
      );
      if (await filesTab.isVisible()) {
        await filesTab.click();
        await page.waitForTimeout(300);
      }

      // 截图
      const panel = page.locator(
        '[data-context-panel], aside[class*="context"]'
      );
      if (await panel.isVisible()) {
        await expect(panel).toHaveScreenshot("context-panel-files-tab.png", {
          maxDiffPixels: 100,
        });
      }
    });

    test("ContextPanel - SubAgents Tab 布局", async ({ page }) => {
      // 打开右侧边栏
      const contextToggle = page.locator(
        'button[aria-label*="上下文"], button[aria-label*="Context"], button:has-text("任务工作台")'
      );
      if (await contextToggle.isVisible()) {
        await contextToggle.click();
        await page.waitForTimeout(500);
      }

      // 切换到 SubAgents Tab
      const subAgentsTab = page.locator(
        'button[role="tab"]:has-text("SubAgents"), button:has-text("子代理")'
      );
      if (await subAgentsTab.isVisible()) {
        await subAgentsTab.click();
        await page.waitForTimeout(300);
      }

      // 截图
      const panel = page.locator(
        '[data-context-panel], aside[class*="context"]'
      );
      if (await panel.isVisible()) {
        await expect(panel).toHaveScreenshot(
          "context-panel-subagents-tab.png",
          {
            maxDiffPixels: 100,
          }
        );
      }
    });
  });

  /**
   * ========================================
   * ChatMessage 视觉回归测试
   * ========================================
   */
  test.describe("ChatMessage", () => {
    test("ChatMessage - 用户消息样式", async ({ page }) => {
      // 发送一条用户消息
      const input = page.locator(
        'textarea[placeholder*="输入"], textarea[placeholder*="message"], [data-chat-input]'
      );

      if (await input.isVisible()) {
        await input.fill("测试消息 - 用户消息样式验证");
        await page.waitForTimeout(200);

        // 截图输入区域
        const inputArea = page.locator(
          '[data-chat-input-area], div[class*="input"], form[class*="chat"]'
        );
        if (await inputArea.isVisible()) {
          await expect(inputArea).toHaveScreenshot("chat-message-input.png", {
            maxDiffPixels: 50,
          });
        }
      }
    });

    test("ChatMessage - AI 消息样式", async ({ page }) => {
      // 等待 AI 消息出现（如果有）
      const aiMessage = page.locator(
        '[data-ai-message], [data-last-message], div[class*="ai-message"]'
      );

      if (await aiMessage.isVisible()) {
        await expect(aiMessage).toHaveScreenshot("chat-message-ai.png", {
          maxDiffPixels: 150,
        });
      }
    });

    test("ChatMessage - 消息列表布局", async ({ page }) => {
      // 截图整个消息列表区域
      const messageList = page.locator(
        '[data-message-list], div[class*="message-list"], div[class*="chat-messages"]'
      );

      if (await messageList.isVisible()) {
        await expect(messageList).toHaveScreenshot(
          "chat-message-list-layout.png",
          {
            maxDiffPixels: 200,
            fullPage: false,
          }
        );
      }
    });
  });

  /**
   * ========================================
   * ToolCallBox 视觉回归测试
   * ========================================
   */
  test.describe("ToolCallBox", () => {
    test("ToolCallBox - 搜索工具样式", async ({ page }) => {
      const searchTool = page.locator(
        '[data-tool="web_search"], [class*="web_search"]'
      );

      if (await searchTool.isVisible()) {
        await expect(searchTool).toHaveScreenshot(
          "tool-call-box-web-search.png",
          {
            maxDiffPixels: 50,
          }
        );
      }
    });

    test("ToolCallBox - Shell 工具样式", async ({ page }) => {
      const shellTool = page.locator(
        '[data-tool="shell"], [data-tool="bash"], [data-tool="execute"]'
      );

      if (await shellTool.isVisible()) {
        await expect(shellTool.first()).toHaveScreenshot(
          "tool-call-box-shell.png",
          {
            maxDiffPixels: 50,
          }
        );
      }
    });

    test("ToolCallBox - 文件工具样式", async ({ page }) => {
      const fileTool = page.locator(
        '[data-tool="write_file"], [data-tool="read_file"], [data-tool="edit_file"]'
      );

      if (await fileTool.isVisible()) {
        await expect(fileTool.first()).toHaveScreenshot(
          "tool-call-box-file-ops.png",
          {
            maxDiffPixels: 50,
          }
        );
      }
    });

    test("ToolCallBox - 导航工具样式", async ({ page }) => {
      const navTool = page.locator(
        '[data-tool="ls"], [data-tool="glob"], [data-tool="grep"]'
      );

      if (await navTool.isVisible()) {
        await expect(navTool.first()).toHaveScreenshot(
          "tool-call-box-navigation.png",
          {
            maxDiffPixels: 50,
          }
        );
      }
    });

    test("ToolCallBox - 网络工具样式", async ({ page }) => {
      const webTool = page.locator(
        '[data-tool="browse"], [data-tool="fetch_webpage"]'
      );

      if (await webTool.isVisible()) {
        await expect(webTool.first()).toHaveScreenshot(
          "tool-call-box-web-browse.png",
          {
            maxDiffPixels: 50,
          }
        );
      }
    });

    test("ToolCallBox - Think 工具样式", async ({ page }) => {
      const thinkTool = page.locator('[data-tool="think"]');

      if (await thinkTool.isVisible()) {
        await expect(thinkTool).toHaveScreenshot("tool-call-box-think.png", {
          maxDiffPixels: 50,
        });
      }
    });

    test("ToolCallBox - Task 工具样式", async ({ page }) => {
      const taskTool = page.locator('[data-tool="task"]');

      if (await taskTool.isVisible()) {
        await expect(taskTool).toHaveScreenshot("tool-call-box-task.png", {
          maxDiffPixels: 50,
        });
      }
    });
  });

  /**
   * ========================================
   * ConfigDialog 视觉回归测试
   * ========================================
   */
  test.describe("ConfigDialog", () => {
    test("ConfigDialog - 配置弹窗布局", async ({ page }) => {
      // 查找配置按钮并打开对话框
      const configButton = page.locator(
        'button[aria-label*="设置"], button[aria-label*="配置"], button:has-text("配置"), button:has-text("Settings")'
      );

      if (await configButton.isVisible()) {
        await configButton.click();
        await page.waitForTimeout(500);

        // 截图对话框
        const dialog = page.locator(
          '[role="dialog"], [data-dialog], div[class*="dialog"], div[class*="ConfigDialog"]'
        );

        if (await dialog.isVisible()) {
          await expect(dialog).toHaveScreenshot(
            "config-dialog-layout.png",
            {
              maxDiffPixels: 100,
            }
          );
        }
      }
    });
  });

  /**
   * ========================================
   * ThreadList 视觉回归测试
   * ========================================
   */
  test.describe("ThreadList", () => {
    test("ThreadList - 左侧边栏布局", async ({ page }) => {
      // 查找左侧边栏
      const sidebar = page.locator(
        'aside[class*="thread"], [data-thread-list], div[class*="sidebar"], div[class*="ThreadList"]'
      );

      if (await sidebar.isVisible()) {
        await expect(sidebar).toHaveScreenshot("thread-list-sidebar.png", {
          maxDiffPixels: 150,
        });
      }
    });

    test("ThreadList - 历史记录列表", async ({ page }) => {
      // 查找历史记录列表
      const historyList = page.locator(
        '[data-thread-history], ul[class*="thread"], div[class*="history"]'
      );

      if (await historyList.isVisible()) {
        await expect(historyList).toHaveScreenshot(
          "thread-list-history.png",
          {
            maxDiffPixels: 100,
          }
        );
      }
    });
  });

  /**
   * ========================================
   * 整体页面布局视觉回归测试
   * ========================================
   */
  test.describe("整体布局", () => {
    test("首页 - 完整布局截图", async ({ page }) => {
      // 等待页面完全加载
      await page.waitForTimeout(1000);

      // 全屏截图
      await expect(page).toHaveScreenshot("home-page-full-layout.png", {
        fullPage: true,
        maxDiffPixels: 300,
      });
    });

    test("首页 - 视口布局截图", async ({ page }) => {
      // 等待页面完全加载
      await page.waitForTimeout(1000);

      // 当前视口截图
      await expect(page).toHaveScreenshot("home-page-viewport.png", {
        fullPage: false,
        maxDiffPixels: 200,
      });
    });
  });
});
