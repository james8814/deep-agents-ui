import React from "react";
import { render, screen } from "@testing-library/react";
import { ChatMessage } from "@/app/components/ChatMessage";

const deliveryCardSpy = jest.fn();

jest.mock("@/app/components/SubAgentIndicator", () => ({
  SubAgentIndicator: () => null,
}));

jest.mock("@/app/components/ToolCallBox", () => ({
  ToolCallBox: () => null,
}));

jest.mock("@/app/components/MarkdownContent", () => ({
  MarkdownContent: ({ content }: { content: string }) => <div>{content}</div>,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

jest.mock("@/app/components/DeliveryCard", () => ({
  DeliveryCard: (props: unknown) => {
    deliveryCardSpy(props);
    return <div data-testid="delivery-card" />;
  },
}));

describe("ChatMessage DeliveryCard 映射", () => {
  beforeEach(() => {
    deliveryCardSpy.mockClear();
  });

  const baseMessage = {
    id: "ai-message-1",
    type: "ai",
    content: "已生成交付物",
  } as any;

  test("应在路径完全匹配时传递可用文件内容", () => {
    render(
      <ChatMessage
        message={baseMessage}
        toolCalls={[]}
        files={{ "/workspace/deliverables/report.md": "# 报告内容" }}
        allDeliverablePaths={["/workspace/deliverables/report.md"]}
        threadId="thread-123"
      />
    );

    expect(screen.getByTestId("delivery-card")).toBeInTheDocument();
    expect(deliveryCardSpy).toHaveBeenCalledTimes(1);

    const firstCall = deliveryCardSpy.mock.calls[0]?.[0] as {
      files: Array<{
        path: string;
        content: string;
        available?: boolean;
        shareUrl?: string;
      }>;
    };
    const { files } = firstCall;

    expect(files).toEqual([
      {
        path: "/workspace/deliverables/report.md",
        content: "# 报告内容",
        metadata: undefined,
        shareUrl:
          "http://localhost:3000/threads/thread-123/files/%2Fworkspace%2Fdeliverables%2Freport.md",
        available: true,
      },
    ]);
  });

  test("应在路径不同但文件名一致时回退到已存在文件内容", () => {
    render(
      <ChatMessage
        message={baseMessage}
        toolCalls={[]}
        files={{ "/tmp/agent-output/test_delivery.md": "# 交付物\n内容可用" }}
        allDeliverablePaths={["/workspace/deliverables/test_delivery.md"]}
        threadId="thread-456"
      />
    );

    expect(screen.getByTestId("delivery-card")).toBeInTheDocument();
    expect(deliveryCardSpy).toHaveBeenCalledTimes(1);

    const firstCall = deliveryCardSpy.mock.calls[0]?.[0] as {
      files: Array<{
        path: string;
        content: string;
        available?: boolean;
        shareUrl?: string;
      }>;
    };
    const { files } = firstCall;

    expect(files).toEqual([
      {
        path: "/tmp/agent-output/test_delivery.md",
        content: "# 交付物\n内容可用",
        metadata: undefined,
        shareUrl:
          "http://localhost:3000/threads/thread-456/files/%2Ftmp%2Fagent-output%2Ftest_delivery.md",
        available: true,
      },
    ]);
  });
});
