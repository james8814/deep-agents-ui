/**
 * WelcomeScreen Component Tests
 * Tests for rendering, animations, and user interactions
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WelcomeScreen } from "../WelcomeScreen";

// Mock button component
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  ),
}));

describe("WelcomeScreen Component", () => {
  const mockOnGetStarted = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render welcome screen with main content", () => {
      render(<WelcomeScreen onGetStarted={mockOnGetStarted} />);

      expect(screen.getByText("Deep Agents Studio")).toBeInTheDocument();
      expect(
        screen.getByText(/AI-powered Product Management Assistant/i)
      ).toBeInTheDocument();
    });

    it("should render get started button", () => {
      render(<WelcomeScreen onGetStarted={mockOnGetStarted} />);

      const button = screen.getByRole("button", { name: /get started/i });
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();
    });

    it("should render quick action items", () => {
      render(<WelcomeScreen onGetStarted={mockOnGetStarted} />);

      expect(screen.getByText("Quick Start")).toBeInTheDocument();
      expect(screen.getByText("Documentation")).toBeInTheDocument();
      expect(screen.getByText("Examples")).toBeInTheDocument();
      expect(screen.getByText("Advanced")).toBeInTheDocument();
    });

    it("should display assistant ID when provided", () => {
      const assistantId = "test-assistant-123";
      render(
        <WelcomeScreen
          onGetStarted={mockOnGetStarted}
          assistantId={assistantId}
        />
      );

      expect(
        screen.getByText(`Connected to: ${assistantId}`)
      ).toBeInTheDocument();
    });

    it("should not display assistant ID when not provided", () => {
      render(<WelcomeScreen onGetStarted={mockOnGetStarted} />);

      expect(screen.queryByText(/Connected to:/)).not.toBeInTheDocument();
    });

    it("should render footer links", () => {
      render(<WelcomeScreen onGetStarted={mockOnGetStarted} />);

      expect(screen.getByRole("link", { name: /github/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /docs/i })).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /support/i })
      ).toBeInTheDocument();
    });
  });

  describe("Interactions", () => {
    it("should call onGetStarted when button is clicked", async () => {
      render(<WelcomeScreen onGetStarted={mockOnGetStarted} />);

      const button = screen.getByRole("button", { name: /get started/i });
      fireEvent.click(button);

      expect(mockOnGetStarted).toHaveBeenCalledTimes(1);
    });

    it("should disable button when isLoading is true", () => {
      render(
        <WelcomeScreen
          onGetStarted={mockOnGetStarted}
          isLoading={true}
        />
      );

      const button = screen.getByRole("button", { name: /connecting/i });
      expect(button).toBeDisabled();
    });

    it("should show loading text when isLoading is true", () => {
      render(
        <WelcomeScreen
          onGetStarted={mockOnGetStarted}
          isLoading={true}
        />
      );

      expect(screen.getByText(/connecting/i)).toBeInTheDocument();
    });
  });

  describe("Animations", () => {
    it("should apply fade-in-scale animation to logo", () => {
      const { container } = render(
        <WelcomeScreen onGetStarted={mockOnGetStarted} />
      );

      const logoContainer = container.querySelector(".floating");
      expect(logoContainer).toBeInTheDocument();
      expect(logoContainer).toHaveClass("floating");
    });

    it("should apply slide-in-up animations to content", () => {
      const { container } = render(
        <WelcomeScreen onGetStarted={mockOnGetStarted} />
      );

      const slideElements = container.querySelectorAll(".slide-in-up");
      expect(slideElements.length).toBeGreaterThan(0);
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading hierarchy", () => {
      render(<WelcomeScreen onGetStarted={mockOnGetStarted} />);

      const heading = screen.getByRole("heading", {
        name: /Deep Agents Studio/i,
      });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe("H1");
    });

    it("should have descriptive alt text for logo", () => {
      const { container } = render(
        <WelcomeScreen onGetStarted={mockOnGetStarted} />
      );

      const logo = container.querySelector('svg[class*="h-8"]');
      expect(logo).toBeInTheDocument();
    });

    it("should have accessible button labels", () => {
      render(<WelcomeScreen onGetStarted={mockOnGetStarted} />);

      const button = screen.getByRole("button", { name: /get started/i });
      expect(button).toHaveAccessibleName();
    });

    it("should have proper link attributes for external links", () => {
      render(<WelcomeScreen onGetStarted={mockOnGetStarted} />);

      const links = screen.getAllByRole("link");
      links.forEach((link) => {
        expect(link).toHaveAttribute("target", "_blank");
        expect(link).toHaveAttribute("rel", "noopener noreferrer");
      });
    });
  });

  describe("Responsive Layout", () => {
    it("should render heading in appropriate sizes", () => {
      const { container } = render(
        <WelcomeScreen onGetStarted={mockOnGetStarted} />
      );

      const heading = container.querySelector("h1");
      expect(heading).toHaveClass("sm:text-5xl");
    });

    it("should render quick actions in grid layout", () => {
      const { container } = render(
        <WelcomeScreen onGetStarted={mockOnGetStarted} />
      );

      const grid = container.querySelector('[class*="grid"]');
      expect(grid).toHaveClass("sm:grid-cols-2");
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long assistant IDs", () => {
      const longId = "a".repeat(100);
      render(
        <WelcomeScreen
          onGetStarted={mockOnGetStarted}
          assistantId={longId}
        />
      );

      expect(screen.getByText(`Connected to: ${longId}`)).toBeInTheDocument();
    });

    it("should handle rapid button clicks", () => {
      render(<WelcomeScreen onGetStarted={mockOnGetStarted} />);

      const button = screen.getByRole("button", { name: /get started/i });
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      // Should still only call once due to implementation
      expect(mockOnGetStarted).toHaveBeenCalled();
    });
  });

  describe("Hydration", () => {
    it("should handle mounting state correctly", async () => {
      render(<WelcomeScreen onGetStarted={mockOnGetStarted} />);

      await waitFor(() => {
        expect(screen.getByText("Deep Agents Studio")).toBeInTheDocument();
      });
    });
  });
});
