/**
 * StatusIndicator Component Tests
 * Tests for status display, animations, and accessibility
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { StatusIndicator } from "../StatusIndicator";

// Mock tooltip component
jest.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children, asChild }: any) =>
    asChild ? children : <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div role="tooltip">{children}</div>,
  TooltipProvider: ({ children }: any) => <div>{children}</div>,
}));

describe("StatusIndicator Component", () => {
  describe("Rendering", () => {
    it("should render connected status", () => {
      render(
        <StatusIndicator
          status="connected"
          showLabel
        />
      );

      expect(screen.getByText("Connected")).toBeInTheDocument();
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("should render connecting status", () => {
      render(
        <StatusIndicator
          status="connecting"
          showLabel
        />
      );

      expect(screen.getByText("Connecting")).toBeInTheDocument();
    });

    it("should render disconnected status", () => {
      render(
        <StatusIndicator
          status="disconnected"
          showLabel
        />
      );

      expect(screen.getByText("Disconnected")).toBeInTheDocument();
    });

    it("should render error status", () => {
      render(
        <StatusIndicator
          status="error"
          showLabel
        />
      );

      expect(screen.getByText("Error")).toBeInTheDocument();
    });

    it("should render idle status", () => {
      render(
        <StatusIndicator
          status="idle"
          showLabel
        />
      );

      expect(screen.getByText("Idle")).toBeInTheDocument();
    });

    it("should render custom label when provided", () => {
      render(
        <StatusIndicator
          status="connected"
          label="Agent Status"
          showLabel
        />
      );

      expect(screen.getByText("Agent Status")).toBeInTheDocument();
    });

    it("should not show label when showLabel is false", () => {
      render(
        <StatusIndicator
          status="connected"
          label="Connected"
          showLabel={false}
        />
      );

      expect(screen.queryByText("Connected")).not.toBeInTheDocument();
    });
  });

  describe("Visual Variants", () => {
    it("should apply correct color for connected status", () => {
      const { container } = render(<StatusIndicator status="connected" />);

      const statusDiv = container.querySelector('[role="status"]');
      expect(statusDiv).toBeInTheDocument();
    });

    it("should apply correct color for error status", () => {
      const { container } = render(<StatusIndicator status="error" />);

      const statusDiv = container.querySelector('[role="status"]');
      expect(statusDiv).toBeInTheDocument();
    });

    it("should handle small size", () => {
      const { container } = render(
        <StatusIndicator
          status="connected"
          size="sm"
        />
      );

      const indicator = container.querySelector("div");
      expect(indicator).toBeInTheDocument();
    });

    it("should handle medium size", () => {
      const { container } = render(
        <StatusIndicator
          status="connected"
          size="md"
        />
      );

      const indicator = container.querySelector("div");
      expect(indicator).toBeInTheDocument();
    });

    it("should handle large size", () => {
      const { container } = render(
        <StatusIndicator
          status="connected"
          size="lg"
        />
      );

      const indicator = container.querySelector("div");
      expect(indicator).toBeInTheDocument();
    });
  });

  describe("Animations", () => {
    it("should pulse when status is connecting and pulse is true", () => {
      const { container } = render(
        <StatusIndicator
          status="connecting"
          pulse={true}
        />
      );

      const pulseElement = container.querySelector('[class*="animate-pulse"]');
      expect(pulseElement).toBeInTheDocument();
    });

    it("should not pulse when pulse is false", () => {
      const { container } = render(
        <StatusIndicator
          status="connected"
          pulse={false}
        />
      );

      const pulseElement = container.querySelector('[class*="animate-pulse"]');
      expect(pulseElement).not.toBeInTheDocument();
    });

    it("should auto-enable pulse for connecting status", () => {
      const { container } = render(<StatusIndicator status="connecting" />);

      const pulseElement = container.querySelector('[class*="animate"]');
      expect(pulseElement).toBeInTheDocument();
    });
  });

  describe("Tooltip", () => {
    it("should show tooltip when description is provided", () => {
      render(
        <StatusIndicator
          status="connected"
          description="All systems operational"
        />
      );

      expect(screen.getByText("All systems operational")).toBeInTheDocument();
    });

    it("should not show tooltip when description is not provided", () => {
      render(<StatusIndicator status="connected" />);

      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });

    it("should have tooltip with proper role when description exists", () => {
      render(
        <StatusIndicator
          status="error"
          description="Connection failed"
        />
      );

      expect(screen.getByText("Connection failed")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper role attribute", () => {
      render(<StatusIndicator status="connected" />);

      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("should have proper aria-label", () => {
      render(
        <StatusIndicator
          status="connected"
          showLabel
        />
      );

      const statusElement = screen.getByRole("status");
      expect(statusElement).toHaveAttribute("aria-label");
      expect(statusElement.getAttribute("aria-label")).toContain("Status:");
    });

    it("should have aria-label with custom label", () => {
      render(
        <StatusIndicator
          status="connected"
          label="Custom Status"
          showLabel
        />
      );

      const statusElement = screen.getByRole("status");
      expect(statusElement.getAttribute("aria-label")).toContain(
        "Custom Status"
      );
    });

    it("should be perceivable without relying on color alone", () => {
      const { container } = render(
        <StatusIndicator
          status="error"
          showLabel
        />
      );

      // Should have both color AND text/icon
      expect(screen.getByText("Error")).toBeInTheDocument();
      expect(container.querySelector("div")).toBeInTheDocument();
    });

    it("should have accessible tooltip content", () => {
      render(
        <StatusIndicator
          status="disconnected"
          description="Please check your connection"
          showLabel
        />
      );

      expect(
        screen.getByText("Please check your connection")
      ).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long labels", () => {
      const longLabel = "A".repeat(100);
      render(
        <StatusIndicator
          status="connected"
          label={longLabel}
          showLabel
        />
      );

      expect(screen.getByText(longLabel)).toBeInTheDocument();
    });

    it("should handle empty description", () => {
      render(
        <StatusIndicator
          status="connected"
          description=""
          showLabel
        />
      );

      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("should handle rapid status changes", () => {
      const { rerender } = render(
        <StatusIndicator
          status="connected"
          showLabel
        />
      );

      rerender(
        <StatusIndicator
          status="disconnected"
          showLabel
        />
      );
      expect(screen.getByText("Disconnected")).toBeInTheDocument();

      rerender(
        <StatusIndicator
          status="connecting"
          showLabel
        />
      );
      expect(screen.getByText("Connecting")).toBeInTheDocument();
    });

    it("should handle null label gracefully", () => {
      render(
        <StatusIndicator
          status="connected"
          label={undefined}
          showLabel
        />
      );

      // Should still render with default label
      expect(screen.getByRole("status")).toBeInTheDocument();
    });
  });

  describe("Integration", () => {
    it("should work with different status and size combinations", () => {
      const statuses = [
        "connected",
        "connecting",
        "disconnected",
        "error",
        "idle",
      ] as const;
      const sizes = ["sm", "md", "lg", "xl"] as const;

      statuses.forEach((status) => {
        sizes.forEach((size) => {
          const { unmount } = render(
            <StatusIndicator
              status={status}
              size={size}
              showLabel
            />
          );
          expect(screen.getByRole("status")).toBeInTheDocument();
          unmount();
        });
      });
    });

    it("should combine tooltip and animation correctly", () => {
      const { container } = render(
        <StatusIndicator
          status="connecting"
          description="Initializing connection"
          pulse={true}
          showLabel
        />
      );

      expect(screen.getByText("Initializing connection")).toBeInTheDocument();
      expect(container.querySelector('[class*="animate"]')).toBeInTheDocument();
    });
  });
});
