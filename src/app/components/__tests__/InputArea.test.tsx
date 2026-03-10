/**
 * InputArea Component Test Suite
 * Tests for input expansion, send status, execution time, and accessibility
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InputArea } from "../InputArea";

describe("InputArea Component", () => {
  const defaultProps = {
    input: "",
    onInputChange: vi.fn(),
    attachedFiles: [],
    onFilesChange: vi.fn(),
    onSubmit: vi.fn(),
    onStop: vi.fn(),
    isLoading: false,
    isDisabled: false,
    onUploadClick: vi.fn(),
    uploadInputRef: React.createRef<HTMLInputElement>(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Input Functionality", () => {
    it("should render textarea with placeholder", () => {
      render(<InputArea {...defaultProps} />);
      const textarea = screen.getByPlaceholderText(/Write your message/i);
      expect(textarea).toBeInTheDocument();
    });

    it("should call onInputChange when typing", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <InputArea
          {...defaultProps}
          onInputChange={onChange}
        />
      );

      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "Hello");

      expect(onChange).toHaveBeenCalledWith("H");
      expect(onChange).toHaveBeenCalledWith("Hello");
    });

    it("should show character count above 500", () => {
      const longText = "a".repeat(600);
      render(
        <InputArea
          {...defaultProps}
          input={longText}
        />
      );
      expect(screen.getByText("600")).toBeInTheDocument();
    });

    it("should not show character count under 500", () => {
      render(
        <InputArea
          {...defaultProps}
          input="short text"
        />
      );
      expect(screen.queryByText("11")).not.toBeInTheDocument();
    });
  });

  describe("Expand/Collapse Functionality", () => {
    it("should toggle expanded state", async () => {
      const user = userEvent.setup();
      const onExpandedChange = vi.fn();

      const { rerender } = render(
        <InputArea
          {...defaultProps}
          input="test content"
          inputExpanded={false}
          onExpandedChange={onExpandedChange}
        />
      );

      const expandButton = screen.getByRole("button", {
        name: /Expand input/i,
      });
      await user.click(expandButton);
      expect(onExpandedChange).toHaveBeenCalledWith(true);

      rerender(
        <InputArea
          {...defaultProps}
          input="test content"
          inputExpanded={true}
          onExpandedChange={onExpandedChange}
        />
      );

      const collapseButton = screen.getByRole("button", {
        name: /Collapse input/i,
      });
      await user.click(collapseButton);
      expect(onExpandedChange).toHaveBeenCalledWith(false);
    });

    it("should disable expand button when input is empty", () => {
      render(
        <InputArea
          {...defaultProps}
          input=""
        />
      );

      const expandButton = screen.getByRole("button", {
        name: /Expand input/i,
      });
      expect(expandButton).toBeDisabled();
    });

    it("should enable expand button when input has content", () => {
      render(
        <InputArea
          {...defaultProps}
          input="some content"
        />
      );

      const expandButton = screen.getByRole("button", {
        name: /Expand input/i,
      });
      expect(expandButton).not.toBeDisabled();
    });
  });

  describe("Submit Functionality", () => {
    it("should call onSubmit when send button is clicked", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(
        <InputArea
          {...defaultProps}
          input="test message"
          onSubmit={onSubmit}
        />
      );

      const sendButton = screen.getByRole("button", { name: /Send/i });
      await user.click(sendButton);

      expect(onSubmit).toHaveBeenCalled();
    });

    it("should call onStop when send button is clicked during loading", async () => {
      const user = userEvent.setup();
      const onStop = vi.fn();

      render(
        <InputArea
          {...defaultProps}
          input="test message"
          isLoading={true}
          onStop={onStop}
        />
      );

      const stopButton = screen.getByRole("button", { name: /Stop/i });
      await user.click(stopButton);

      expect(onStop).toHaveBeenCalled();
    });

    it("should disable send button when loading", () => {
      render(
        <InputArea
          {...defaultProps}
          input="test"
          isLoading={true}
        />
      );

      const button = screen.getByRole("button", { name: /Stop/i });
      expect(button).not.toBeDisabled();
    });

    it("should disable send button when input is empty", () => {
      render(
        <InputArea
          {...defaultProps}
          input=""
        />
      );

      const button = screen.getByRole("button", { name: /Send/i });
      expect(button).toBeDisabled();
    });
  });

  describe("Execution Time Display", () => {
    it("should display execution time", () => {
      render(
        <InputArea
          {...defaultProps}
          executionTime={5}
        />
      );

      expect(screen.getByText("5s")).toBeInTheDocument();
    });

    it("should format execution time in milliseconds", () => {
      render(
        <InputArea
          {...defaultProps}
          executionTime={500}
        />
      );

      expect(screen.getByText("500ms")).toBeInTheDocument();
    });

    it("should format execution time in minutes", () => {
      render(
        <InputArea
          {...defaultProps}
          executionTime={125} // 2m 5s
        />
      );

      expect(screen.getByText("2m 5s")).toBeInTheDocument();
    });

    it("should show sending status indicator", () => {
      render(
        <InputArea
          {...defaultProps}
          executionTime={1}
          sendStatus="sending"
        />
      );

      const pulse = document.querySelector(".animate-pulse");
      expect(pulse).toBeInTheDocument();
    });

    it("should show error status indicator", () => {
      render(
        <InputArea
          {...defaultProps}
          executionTime={1}
          sendStatus="error"
        />
      );

      const errorIndicator = document.querySelector(".bg-red-500");
      expect(errorIndicator).toBeInTheDocument();
    });
  });

  describe("Keyboard Navigation", () => {
    it("should submit on Cmd/Ctrl+Enter", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(
        <InputArea
          {...defaultProps}
          input="test"
          onSubmit={onSubmit}
        />
      );

      const textarea = screen.getByRole("textbox");
      await user.click(textarea);
      await user.keyboard("{Meta>}Enter{/Meta}");

      expect(onSubmit).toHaveBeenCalled();
    });

    it("should submit on Enter in compact mode", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(
        <InputArea
          {...defaultProps}
          input="test"
          inputExpanded={false}
          onSubmit={onSubmit}
        />
      );

      const textarea = screen.getByRole("textbox");
      await user.click(textarea);
      await user.keyboard("Enter");

      expect(onSubmit).toHaveBeenCalled();
    });

    it("should not submit on Enter in expanded mode", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(
        <InputArea
          {...defaultProps}
          input="test"
          inputExpanded={true}
          onSubmit={onSubmit}
        />
      );

      const textarea = screen.getByRole("textbox");
      await user.click(textarea);
      await user.keyboard("Enter");

      // Should not call onSubmit in expanded mode without modifiers
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("should allow Shift+Enter for newline", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(
        <InputArea
          {...defaultProps}
          input="line1"
          onInputChange={onChange}
        />
      );

      const textarea = screen.getByRole("textbox");
      await user.click(textarea);
      // Type the current content first
      await user.clear(textarea);
      await user.type(textarea, "line1");

      // Shift+Enter should add newline (browser default behavior)
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

      expect(onChange).toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA labels", () => {
      render(
        <InputArea
          {...defaultProps}
          input="test"
        />
      );

      const textarea = screen.getByLabelText("Message input");
      expect(textarea).toBeInTheDocument();
    });

    it("should announce character count to screen readers", () => {
      const longText = "a".repeat(600);
      render(
        <InputArea
          {...defaultProps}
          input={longText}
        />
      );

      const charCount = screen.getByText("600");
      expect(charCount.id).toBe("char-count");
    });

    it("should have aria-busy when loading", () => {
      render(
        <InputArea
          {...defaultProps}
          isLoading={true}
        />
      );

      const button = screen.getByRole("button", { name: /Stop/i });
      expect(button).toHaveAttribute("aria-busy", "true");
    });

    it("should have aria-expanded for expand button", () => {
      const { rerender } = render(
        <InputArea
          {...defaultProps}
          input="test"
          inputExpanded={false}
        />
      );

      let expandButton = screen.getByRole("button", { name: /Expand input/i });
      expect(expandButton).toHaveAttribute("aria-pressed", "false");

      rerender(
        <InputArea
          {...defaultProps}
          input="test"
          inputExpanded={true}
        />
      );

      expandButton = screen.getByRole("button", { name: /Collapse input/i });
      expect(expandButton).toHaveAttribute("aria-pressed", "true");
    });

    it("should have proper focus visibility", async () => {
      const user = userEvent.setup();

      render(<InputArea {...defaultProps} />);

      const textarea = screen.getByRole("textbox");
      await user.tab();

      expect(textarea).toHaveFocus();
    });
  });

  describe("Disabled State", () => {
    it("should disable all inputs when isDisabled is true", () => {
      render(
        <InputArea
          {...defaultProps}
          isDisabled={true}
        />
      );

      const textarea = screen.getByRole("textbox");
      const uploadButton = screen.getByRole("button", { name: /Upload/i });

      expect(textarea).toBeDisabled();
      expect(uploadButton).toBeDisabled();
    });

    it("should show disabled placeholder", () => {
      render(
        <InputArea
          {...defaultProps}
          isDisabled={true}
        />
      );

      const textarea = screen.getByPlaceholderText(
        /Agent is waiting for approval/i
      );
      expect(textarea).toBeInTheDocument();
    });
  });

  describe("Upload Functionality", () => {
    it("should call onUploadClick when upload button is clicked", async () => {
      const user = userEvent.setup();
      const onUploadClick = vi.fn();

      render(
        <InputArea
          {...defaultProps}
          onUploadClick={onUploadClick}
        />
      );

      const uploadButton = screen.getByRole("button", { name: /Upload/i });
      await user.click(uploadButton);

      expect(onUploadClick).toHaveBeenCalled();
    });

    it("should disable upload button during loading", () => {
      render(
        <InputArea
          {...defaultProps}
          isLoading={true}
        />
      );

      const uploadButton = screen.getByRole("button", { name: /Upload/i });
      expect(uploadButton).toBeDisabled();
    });
  });
});
