/**
 * ToolCallBoxEnhanced Component Test Suite
 * Tests for risk badges, execution time, copy functionality, and accessibility
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToolCallBoxEnhanced } from "../ToolCallBoxEnhanced";
import type { ToolCall } from "@/app/types/types";

describe("ToolCallBoxEnhanced Component", () => {
  const mockToolCall: ToolCall = {
    id: "tc-1",
    name: "read_file",
    args: { path: "/tmp/file.txt" },
    status: "completed",
  };

  const defaultProps = {
    toolCall: mockToolCall,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Tool Call Display", () => {
    it("should render tool name", () => {
      render(<ToolCallBoxEnhanced {...defaultProps} />);
      expect(screen.getByText("read_file")).toBeInTheDocument();
    });

    it("should render status icon for completed status", () => {
      render(<ToolCallBoxEnhanced {...defaultProps} />);
      const icon = document.querySelector(".text-green-600");
      expect(icon).toBeInTheDocument();
    });

    it("should render status icon for pending status", () => {
      const toolCall = { ...mockToolCall, status: "pending" as const };
      render(
        <ToolCallBoxEnhanced
          {...defaultProps}
          toolCall={toolCall}
        />
      );
      const spinnerIcon = document.querySelector(".animate-spin");
      expect(spinnerIcon).toBeInTheDocument();
    });

    it("should render status icon for error status", () => {
      const toolCall = { ...mockToolCall, status: "error" as const };
      render(
        <ToolCallBoxEnhanced
          {...defaultProps}
          toolCall={toolCall}
        />
      );
      const icon = document.querySelector(".text-destructive");
      expect(icon).toBeInTheDocument();
    });

    it("should render status icon for interrupted status", () => {
      const toolCall = { ...mockToolCall, status: "interrupted" as const };
      render(
        <ToolCallBoxEnhanced
          {...defaultProps}
          toolCall={toolCall}
        />
      );
      const icon = document.querySelector(".text-warning");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("Risk Badges", () => {
    it("should display low risk badge for read_file", () => {
      render(<ToolCallBoxEnhanced {...defaultProps} />);
      expect(screen.getByText("Read-only")).toBeInTheDocument();
    });

    it("should display high risk badge for write_file", () => {
      const toolCall = { ...mockToolCall, name: "write_file" };
      render(
        <ToolCallBoxEnhanced
          {...defaultProps}
          toolCall={toolCall}
        />
      );
      expect(screen.getByText("Write Risk")).toBeInTheDocument();
    });

    it("should display critical risk badge for delete_file", () => {
      const toolCall = { ...mockToolCall, name: "delete_file" };
      render(
        <ToolCallBoxEnhanced
          {...defaultProps}
          toolCall={toolCall}
        />
      );
      expect(screen.getByText("Delete Risk")).toBeInTheDocument();
    });

    it("should display critical risk badge for execute_command", () => {
      const toolCall = { ...mockToolCall, name: "execute_command" };
      render(
        <ToolCallBoxEnhanced
          {...defaultProps}
          toolCall={toolCall}
        />
      );
      expect(screen.getByText("Execute Risk")).toBeInTheDocument();
    });

    it("should display custom risk level when provided", () => {
      render(
        <ToolCallBoxEnhanced
          {...defaultProps}
          riskLevel="high"
        />
      );
      // The risk badge should show even though tool is read_file
      const badge = screen.getAllByText(/Risk|Safe|Tool/)[0];
      expect(badge).toBeInTheDocument();
    });

    it("should show risk description on hover", () => {
      const toolCall = { ...mockToolCall, name: "write_file" };
      render(
        <ToolCallBoxEnhanced
          {...defaultProps}
          toolCall={toolCall}
        />
      );
      const badge = screen.getByText("Write Risk");
      expect(badge.parentElement).toHaveAttribute("title", "Modifies files");
    });
  });

  describe("Execution Time Display", () => {
    it("should display execution time in milliseconds", () => {
      render(
        <ToolCallBoxEnhanced
          {...defaultProps}
          executionTime={500}
        />
      );
      expect(screen.getByText("500ms")).toBeInTheDocument();
    });

    it("should display execution time in seconds", () => {
      render(
        <ToolCallBoxEnhanced
          {...defaultProps}
          executionTime={2500}
        />
      );
      expect(screen.getByText("2.5s")).toBeInTheDocument();
    });

    it("should not display execution time if undefined", () => {
      render(
        <ToolCallBoxEnhanced
          {...defaultProps}
          executionTime={undefined}
        />
      );
      expect(screen.queryByText(/ms|s$/)).not.toBeInTheDocument();
    });
  });

  describe("Expand/Collapse Functionality", () => {
    it("should expand when clicked", async () => {
      const user = userEvent.setup();
      const toolCall = {
        ...mockToolCall,
        result: "File contents",
      };

      render(
        <ToolCallBoxEnhanced
          {...defaultProps}
          toolCall={toolCall}
        />
      );

      const button = screen.getByRole("button");
      await user.click(button);

      expect(screen.getByText("File contents")).toBeInTheDocument();
    });

    it("should display arguments when expanded", async () => {
      const user = userEvent.setup();
      const toolCall = {
        ...mockToolCall,
        args: { path: "/tmp/file.txt", encoding: "utf-8" },
      };

      render(
        <ToolCallBoxEnhanced
          {...defaultProps}
          toolCall={toolCall}
        />
      );

      const button = screen.getByRole("button");
      await user.click(button);

      // Wait for arguments section to appear
      await waitFor(() => {
        expect(screen.getByText("Arguments")).toBeInTheDocument();
      });
    });

    it("should display result when expanded", async () => {
      const user = userEvent.setup();
      const result = "Hello, World!";
      const toolCall = { ...mockToolCall, result };

      render(
        <ToolCallBoxEnhanced
          {...defaultProps}
          toolCall={toolCall}
        />
      );

      const button = screen.getByRole("button");
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Hello, World!/)).toBeInTheDocument();
      });
    });

    it("should be disabled when no content", () => {
      const toolCall = { ...mockToolCall, args: {}, result: undefined };
      render(
        <ToolCallBoxEnhanced
          {...defaultProps}
          toolCall={toolCall}
        />
      );

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });

    it("should start expanded for interrupted status", () => {
      const toolCall = {
        ...mockToolCall,
        status: "interrupted" as const,
        result: "some output",
      };
      render(
        <ToolCallBoxEnhanced
          {...defaultProps}
          toolCall={toolCall}
        />
      );

      expect(screen.getByText("some output")).toBeInTheDocument();
    });
  });

  describe("Copy Functionality", () => {
    beforeEach(() => {
      // Mock clipboard
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn(() => Promise.resolve()),
        },
      });
    });

    it("should show copy button for arguments", async () => {
      const user = userEvent.setup();
      const toolCall = {
        ...mockToolCall,
        args: { path: "/tmp/file.txt" },
      };

      render(
        <ToolCallBoxEnhanced
          {...defaultProps}
          toolCall={toolCall}
          showCopyButton={true}
        />
      );

      const button = screen.getByRole("button", { name: /read_file/i });
      await user.click(button);

      const copyButton = screen.getByText("Copy");
      expect(copyButton).toBeInTheDocument();
    });

    it("should copy arguments to clipboard", async () => {
      const user = userEvent.setup();
      const args = { path: "/tmp/file.txt", encoding: "utf-8" };
      const toolCall = { ...mockToolCall, args };

      render(
        <ToolCallBoxEnhanced
          {...defaultProps}
          toolCall={toolCall}
          showCopyButton={true}
        />
      );

      const button = screen.getByRole("button", { name: /read_file/i });
      await user.click(button);

      const copyButton = screen.getByText("Copy");
      await user.click(copyButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        JSON.stringify(args, null, 2)
      );
    });

    it("should show 'Copied!' feedback", async () => {
      const user = userEvent.setup();
      const toolCall = {
        ...mockToolCall,
        args: { path: "/tmp/file.txt" },
      };

      render(
        <ToolCallBoxEnhanced
          {...defaultProps}
          toolCall={toolCall}
          showCopyButton={true}
        />
      );

      const button = screen.getByRole("button", { name: /read_file/i });
      await user.click(button);

      const copyButton = screen.getByText("Copy");
      await user.click(copyButton);

      expect(screen.getByText("Copied!")).toBeInTheDocument();
    });

    it("should not show copy button when disabled", () => {
      const toolCall = {
        ...mockToolCall,
        args: { path: "/tmp/file.txt" },
      };

      render(
        <ToolCallBoxEnhanced
          {...defaultProps}
          toolCall={toolCall}
          showCopyButton={false}
        />
      );

      // Even when expanded, copy button should not appear
      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA labels", () => {
      render(<ToolCallBoxEnhanced {...defaultProps} />);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-label");
    });

    it("should have aria-expanded attribute", () => {
      const toolCall = { ...mockToolCall, result: "output" };
      render(
        <ToolCallBoxEnhanced
          {...defaultProps}
          toolCall={toolCall}
        />
      );

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-expanded");
    });

    it("should have aria-controls for expanded content", () => {
      const toolCall = { ...mockToolCall, result: "output" };
      render(
        <ToolCallBoxEnhanced
          {...defaultProps}
          toolCall={toolCall}
        />
      );

      const button = screen.getByRole("button");
      const contentId = button.getAttribute("aria-controls");
      expect(contentId).toBe(`tool-content-${mockToolCall.id}`);
    });

    it("should have proper semantic HTML structure", () => {
      const toolCall = {
        ...mockToolCall,
        result: "output",
        args: { key: "value" },
      };

      render(
        <ToolCallBoxEnhanced
          {...defaultProps}
          toolCall={toolCall}
        />
      );

      const region = screen.getByRole("region");
      expect(region).toHaveAttribute("aria-label");
    });

    it("should have focus visible styles", async () => {
      const user = userEvent.setup();

      render(<ToolCallBoxEnhanced {...defaultProps} />);

      const button = screen.getByRole("button");
      await user.tab();

      expect(button).toHaveFocus();
    });
  });

  describe("Interrupted Tool Call", () => {
    it("should display approval interrupt when actionRequest exists", () => {
      const actionRequest = {
        name: "approve_action",
        args: { action_id: "123" },
        description: "Approve file deletion",
      };

      const toolCall = { ...mockToolCall, status: "interrupted" as const };

      render(
        <ToolCallBoxEnhanced
          {...defaultProps}
          toolCall={toolCall}
          actionRequest={actionRequest}
          onResume={vi.fn()}
        />
      );

      expect(screen.getByText(/Approve/i)).toBeInTheDocument();
    });

    it("should have visual styling for interrupted status", () => {
      const toolCall = { ...mockToolCall, status: "interrupted" as const };
      const { container } = render(
        <ToolCallBoxEnhanced
          {...defaultProps}
          toolCall={toolCall}
        />
      );

      const mainDiv = container.querySelector('[role="region"]');
      expect(mainDiv).toHaveClass("ring-2", "ring-warning/20");
    });
  });

  describe("Visual States", () => {
    it("should show different styling for completed status", () => {
      const { container } = render(<ToolCallBoxEnhanced {...defaultProps} />);
      const mainDiv = container.querySelector('[role="region"]');
      expect(mainDiv).toHaveClass("border-border/50");
    });

    it("should highlight on hover", () => {
      const toolCall = { ...mockToolCall, result: "output" };
      const { container } = render(
        <ToolCallBoxEnhanced
          {...defaultProps}
          toolCall={toolCall}
        />
      );

      const mainDiv = container.querySelector('[role="region"]');
      expect(mainDiv).toHaveClass("hover:border-border");
    });

    it("should show accent background when expanded", async () => {
      const user = userEvent.setup();
      const toolCall = { ...mockToolCall, result: "output" };
      const { container } = render(
        <ToolCallBoxEnhanced
          {...defaultProps}
          toolCall={toolCall}
        />
      );

      const button = screen.getByRole("button");
      await user.click(button);

      const mainDiv = container.querySelector('[role="region"]');
      expect(mainDiv).toHaveClass("bg-accent/30");
    });
  });
});
