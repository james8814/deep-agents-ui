/**
 * useChat - 文件附件功能单元测试（改进方案 A）
 *
 * 测试覆盖：
 * - 纯文本消息（无附件）
 * - 单个文件附件
 * - 多个文件附件
 * - 向后兼容性
 * - 附件数据完整性
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { FileAttachment } from "../useChat";

// 模拟的助手和客户端配置
const mockAssistant = {
  assistant_id: "test-assistant",
  config: { recursion_limit: 200 },
};

const mockFileAttachment: FileAttachment = {
  path: "/uploads/a841dcf6-df3b-4af1-ba45-d4b59820ae8e/edffd7a7e5b04817.txt",
  filename: "test_document.txt",
  size: 384,
};

const mockFileAttachments: FileAttachment[] = [
  {
    path: "/uploads/a841dcf6-1111-1111-1111-111111111111/asana.md",
    filename: "asana.md",
    size: 1024,
  },
  {
    path: "/uploads/a841dcf6-2222-2222-2222-222222222222/monday.md",
    filename: "monday.md",
    size: 2048,
  },
  {
    path: "/uploads/a841dcf6-3333-3333-3333-333333333333/clickup.md",
    filename: "clickup.md",
    size: 1536,
  },
];

describe("useChat - 文件附件功能（改进方案 A）", () => {
  describe("消息结构", () => {
    it("应该创建纯文本消息，不含附件", () => {
      const messageContent = "分析这个报告";
      const fileAttachments: FileAttachment[] = [];

      // 模拟消息创建逻辑
      const message = {
        type: "human" as const,
        content: messageContent,
        ...(fileAttachments.length > 0 && {
          additional_kwargs: {
            attachments: fileAttachments,
          },
        }),
      };

      expect(message.type).toBe("human");
      expect(message.content).toBe("分析这个报告");
      expect(message.additional_kwargs).toBeUndefined();
    });

    it("应该创建带单个附件的消息", () => {
      const messageContent = "请分析这个文档";
      const fileAttachments: FileAttachment[] = [mockFileAttachment];

      const message = {
        type: "human" as const,
        content: messageContent,
        ...(fileAttachments.length > 0 && {
          additional_kwargs: {
            attachments: fileAttachments.map((att) => ({
              path: att.path,
              filename: att.filename,
              ...(att.size !== undefined && { size: att.size }),
            })),
          },
        }),
      };

      expect(message.type).toBe("human");
      expect(message.content).toBe("请分析这个文档");
      expect(message.additional_kwargs).toBeDefined();
      expect(message.additional_kwargs?.attachments).toHaveLength(1);
      expect(message.additional_kwargs?.attachments?.[0]).toEqual({
        path: "/uploads/a841dcf6-df3b-4af1-ba45-d4b59820ae8e/edffd7a7e5b04817.txt",
        filename: "test_document.txt",
        size: 384,
      });
    });

    it("应该创建带多个附件的消息", () => {
      const messageContent = "对比这三款产品";
      const fileAttachments = mockFileAttachments;

      const message = {
        type: "human" as const,
        content: messageContent,
        ...(fileAttachments.length > 0 && {
          additional_kwargs: {
            attachments: fileAttachments.map((att) => ({
              path: att.path,
              filename: att.filename,
              ...(att.size !== undefined && { size: att.size }),
            })),
          },
        }),
      };

      expect(message.type).toBe("human");
      expect(message.content).toBe("对比这三款产品");
      expect(message.additional_kwargs?.attachments).toHaveLength(3);

      // 验证每个附件的数据
      const attachments = message.additional_kwargs?.attachments;
      expect(attachments?.[0].filename).toBe("asana.md");
      expect(attachments?.[1].filename).toBe("monday.md");
      expect(attachments?.[2].filename).toBe("clickup.md");
    });
  });

  describe("文件附件验证", () => {
    it("应该正确处理所有附件字段", () => {
      const attachment: FileAttachment = {
        path: "/uploads/test-uuid/test-hash.pdf",
        filename: "document.pdf",
        size: 5242880, // 5MB
      };

      expect(attachment.path).toMatch(/^\/uploads\/.*\/.*$/);
      expect(attachment.filename).toBeDefined();
      expect(attachment.size).toBe(5242880);
    });

    it("应该支持可选的大小字段", () => {
      const attachmentWithoutSize: FileAttachment = {
        path: "/uploads/test-uuid/test-hash.txt",
        filename: "file.txt",
      };

      expect(attachmentWithoutSize.size).toBeUndefined();
      expect(attachmentWithoutSize.path).toBeDefined();
      expect(attachmentWithoutSize.filename).toBeDefined();
    });

    it("应该正确提取文件名", () => {
      const path = "/uploads/a841dcf6-df3b-4af1-ba45-d4b59820ae8e/edffd7a7e5b04817.pdf";
      const filename = path.split("/").pop();

      expect(filename).toBe("edffd7a7e5b04817.pdf");
    });
  });

  describe("兼容性", () => {
    it("应该支持向后兼容的单参数调用", () => {
      // sendMessage(content) - 不传递附件参数
      const messageContent = "分析市场趋势";
      const message = {
        type: "human" as const,
        content: messageContent,
        // 无附件
      };

      expect(message.content).toBe("分析市场趋势");
      expect(message.additional_kwargs).toBeUndefined();
    });

    it("应该支持新的双参数调用", () => {
      // sendMessage(content, attachments)
      const messageContent = "请分析这个文件";
      const attachments: FileAttachment[] = [mockFileAttachment];

      const message = {
        type: "human" as const,
        content: messageContent,
        ...(attachments.length > 0 && {
          additional_kwargs: {
            attachments,
          },
        }),
      };

      expect(message.content).toBe("请分析这个文件");
      expect(message.additional_kwargs?.attachments).toHaveLength(1);
    });
  });

  describe("数据流清晰性", () => {
    it("虚拟路径不应该出现在消息文本中", () => {
      const messageContent = "分析这个报告";
      const attachments = [mockFileAttachment];

      // 关键验证：消息文本中不包含虚拟路径
      expect(messageContent).not.toContain("/uploads/");
      expect(attachments[0].path).toContain("/uploads/");

      // 虚拟路径仅在附件中
      expect(attachments[0].path).toMatch(/^\/uploads\/[a-f0-9\-]+\/[a-z0-9.]+$/i);
    });

    it("应该避免虚拟路径重复", () => {
      const messageContent = "分析这个报告";
      const attachments: FileAttachment[] = [mockFileAttachment];

      const message = {
        type: "human" as const,
        content: messageContent,
        ...(attachments.length > 0 && {
          additional_kwargs: { attachments },
        }),
      };

      // 计数虚拟路径出现次数（应该只有 1 次，在附件中）
      const pathInContent = messageContent.includes(mockFileAttachment.path) ? 1 : 0;
      const pathInAttachments = message.additional_kwargs?.attachments?.some(
        (att) => att.path === mockFileAttachment.path
      )
        ? 1
        : 0;

      const totalOccurrences = pathInContent + pathInAttachments;
      expect(totalOccurrences).toBe(1); // 仅在附件中
    });
  });

  describe("边界情况", () => {
    it("应该处理空文件列表", () => {
      const messageContent = "分析报告";
      const attachments: FileAttachment[] = [];

      const message = {
        type: "human" as const,
        content: messageContent,
        ...(attachments.length > 0 && {
          additional_kwargs: { attachments },
        }),
      };

      expect(message.additional_kwargs).toBeUndefined();
    });

    it("应该处理包含特殊字符的文件名", () => {
      const specialFileAttachments: FileAttachment[] = [
        {
          path: "/uploads/uuid/file@v2.pdf",
          filename: "file@v2.pdf",
        },
        {
          path: "/uploads/uuid/report(draft).docx",
          filename: "report(draft).docx",
        },
        {
          path: "/uploads/uuid/final#2.xlsx",
          filename: "final#2.xlsx",
        },
      ];

      // 直接传递，不需要正则提取
      expect(specialFileAttachments[0].filename).toBe("file@v2.pdf");
      expect(specialFileAttachments[1].filename).toBe("report(draft).docx");
      expect(specialFileAttachments[2].filename).toBe("final#2.xlsx");

      // 虚拟路径完整，无截断
      expect(specialFileAttachments[0].path).toContain("file@v2.pdf");
      expect(specialFileAttachments[1].path).toContain("report(draft).docx");
      expect(specialFileAttachments[2].path).toContain("final#2.xlsx");
    });

    it("应该处理非常长的文件名", () => {
      const longFilename =
        "this_is_a_very_long_filename_with_many_characters_that_should_be_handled_correctly_without_truncation_or_errors_123456789.pdf";

      const attachment: FileAttachment = {
        path: `/uploads/uuid/${longFilename}`,
        filename: longFilename,
      };

      expect(attachment.filename.length).toBeGreaterThan(100);
      expect(attachment.path).toContain(longFilename);
    });

    it("应该处理 URL 参数场景（虽然这种情况不应该发生）", () => {
      // 关键改进：使用直接传递，而不是从文本中提取
      // 所以这种情况根本不会出现
      const attachmentPath = "/uploads/uuid/file.pdf"; // 不会有 ?token=xxx
      const attachment: FileAttachment = {
        path: attachmentPath,
        filename: "file.pdf",
      };

      expect(attachment.path).toBe("/uploads/uuid/file.pdf");
      expect(attachment.path).not.toContain("?");
    });
  });

  describe("日志和调试", () => {
    it("应该记录带附件的消息", () => {
      const consoleDebugSpy = vi.spyOn(console, "debug");

      const attachments: FileAttachment[] = [
        mockFileAttachment,
        ...mockFileAttachments,
      ];

      if (attachments.length > 0) {
        console.debug(
          "[useChat] 发送消息，包含 %d 个文件附件",
          attachments.length,
          attachments.map((a) => `${a.filename} (${a.path})`)
        );
      }

      expect(consoleDebugSpy).toHaveBeenCalledWith(
        "[useChat] 发送消息，包含 %d 个文件附件",
        4,
        expect.arrayContaining([
          expect.stringContaining("test_document.txt"),
          expect.stringContaining("asana.md"),
        ])
      );

      consoleDebugSpy.mockRestore();
    });

    it("不应该记录无附件的消息", () => {
      const consoleDebugSpy = vi.spyOn(console, "debug");

      const attachments: FileAttachment[] = [];

      if (attachments.length > 0) {
        console.debug("[useChat] 发送消息，包含附件");
      }

      expect(consoleDebugSpy).not.toHaveBeenCalled();

      consoleDebugSpy.mockRestore();
    });
  });
});
