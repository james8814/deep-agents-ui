/**
 * ErrorBoundary Component Tests
 * Tests for error handling, recovery, and accessibility
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ErrorBoundary, useErrorHandler } from "../ErrorBoundary";

// Mock UI components
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, variant, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  ),
}));

// Component that throws error
const ErrorComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error("Test error message");
  }
  return <div>No error</div>;
};

// Component that uses useErrorHandler
const ComponentWithErrorHandler = ({
  shouldError,
}: {
  shouldError: boolean;
}) => {
  const handleError = useErrorHandler();

  if (shouldError) {
    handleError("Manual error triggered");
  }

  return <div>No error</div>;
};

describe("ErrorBoundary Component", () => {
  beforeEach(() => {
    // Suppress console.error in tests
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Error Catching", () => {
    it("should catch errors from child components", () => {
      render(
        <ErrorBoundary>
          <ErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText("Test error message")).toBeInTheDocument();
    });

    it("should not show error UI when no error occurs", () => {
      render(
        <ErrorBoundary>
          <ErrorComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText("No error")).toBeInTheDocument();
      expect(
        screen.queryByText(/Something went wrong/i)
      ).not.toBeInTheDocument();
    });

    it("should call onError callback when error occurs", () => {
      const onError = jest.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ componentStack: expect.any(String) })
      );
    });

    it("should display error message from thrown error", () => {
      render(
        <ErrorBoundary>
          <ErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText("Test error message")).toBeInTheDocument();
    });
  });

  describe("Error Recovery", () => {
    it("should recover from error when trying again", async () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();

      // Fix the error and rerender
      rerender(
        <ErrorBoundary>
          <ErrorComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      // Click "Try Again" button
      const tryAgainButton = screen.getByRole("button", { name: /Try Again/i });
      fireEvent.click(tryAgainButton);

      await waitFor(() => {
        expect(screen.getByText("No error")).toBeInTheDocument();
      });
    });

    it("should reset error state when resetKeys change", () => {
      const { rerender } = render(
        <ErrorBoundary resetKeys={["key1"]}>
          <ErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();

      // Change resetKeys to trigger reset
      rerender(
        <ErrorBoundary resetKeys={["key2"]}>
          <ErrorComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      // Should reset and show normal content
      expect(screen.getByText("No error")).toBeInTheDocument();
    });

    it("should reset on props change when resetOnPropsChange is true", () => {
      const { rerender } = render(
        <ErrorBoundary resetOnPropsChange>
          <ErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();

      rerender(
        <ErrorBoundary resetOnPropsChange>
          <ErrorComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText("No error")).toBeInTheDocument();
    });
  });

  describe("Fallback UI", () => {
    it("should render custom fallback UI", () => {
      const customFallback = <div>Custom error fallback</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText("Custom error fallback")).toBeInTheDocument();
    });

    it("should display default fallback when none provided", () => {
      render(
        <ErrorBoundary>
          <ErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Try Again/i })
      ).toBeInTheDocument();
    });
  });

  describe("Error Levels", () => {
    it("should render page-level error with full screen", () => {
      const { container } = render(
        <ErrorBoundary level="page">
          <ErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      const errorDiv = container.querySelector('[role="alert"]');
      expect(errorDiv).toHaveClass("h-screen");
    });

    it("should render section-level error with rounded border", () => {
      const { container } = render(
        <ErrorBoundary level="section">
          <ErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      const errorDiv = container.querySelector('[role="alert"]');
      expect(errorDiv).toHaveClass("rounded-lg");
    });

    it("should render inline-level error with minimal styling", () => {
      const { container } = render(
        <ErrorBoundary level="inline">
          <ErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      const errorDiv = container.querySelector('[role="alert"]');
      expect(errorDiv).toBeInTheDocument();
    });
  });

  describe("Development vs Production", () => {
    it("should show stack trace in development", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      render(
        <ErrorBoundary>
          <ErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      const details = screen.getByText(/Error Stack Trace/i);
      expect(details).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    it("should show error ID in production", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      render(
        <ErrorBoundary>
          <ErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Error ID:/i)).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("Accessibility", () => {
    it("should have alert role for accessibility", () => {
      render(
        <ErrorBoundary>
          <ErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("should have aria-live=assertive for urgent announcements", () => {
      render(
        <ErrorBoundary>
          <ErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      const alert = screen.getByRole("alert");
      expect(alert).toHaveAttribute("aria-live", "assertive");
    });

    it("should have aria-atomic=true for complete message", () => {
      render(
        <ErrorBoundary>
          <ErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      const alert = screen.getByRole("alert");
      expect(alert).toHaveAttribute("aria-atomic", "true");
    });

    it("should have proper heading hierarchy", () => {
      render(
        <ErrorBoundary>
          <ErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      const heading = screen.getByRole("heading");
      expect(heading).toBeInTheDocument();
      expect(heading.textContent).toContain("Something went wrong");
    });

    it("should have accessible buttons", () => {
      render(
        <ErrorBoundary>
          <ErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).toHaveAccessibleName();
      });
    });

    it("should have accessible links", () => {
      render(
        <ErrorBoundary>
          <ErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      const links = screen.getAllByRole("link");
      links.forEach((link) => {
        expect(link).toHaveAccessibleName();
      });
    });
  });

  describe("Actions", () => {
    it("should have Try Again button", () => {
      render(
        <ErrorBoundary>
          <ErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(
        screen.getByRole("button", { name: /Try Again/i })
      ).toBeInTheDocument();
    });

    it("should have Reload Page button on page level", () => {
      render(
        <ErrorBoundary level="page">
          <ErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(
        screen.getByRole("button", { name: /Reload Page/i })
      ).toBeInTheDocument();
    });

    it("should have Go Home link", () => {
      render(
        <ErrorBoundary>
          <ErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(
        screen.getByRole("link", { name: /Go Home/i })
      ).toBeInTheDocument();
    });

    it("should execute Try Again action", async () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      const tryAgainButton = screen.getByRole("button", { name: /Try Again/i });
      fireEvent.click(tryAgainButton);

      rerender(
        <ErrorBoundary>
          <ErrorComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByText("No error")).toBeInTheDocument();
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle errors without message", () => {
      const ThrowUnknownError = () => {
        throw new Error();
      };

      render(
        <ErrorBoundary>
          <ThrowUnknownError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    });

    it("should handle multiple error boundaries", () => {
      render(
        <ErrorBoundary level="page">
          <div>
            <ErrorBoundary level="section">
              <ErrorComponent shouldThrow={true} />
            </ErrorBoundary>
          </div>
        </ErrorBoundary>
      );

      // Inner boundary should catch the error
      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    });

    it("should handle rapid error state changes", () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      rerender(
        <ErrorBoundary>
          <ErrorComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      rerender(
        <ErrorBoundary>
          <ErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    });
  });

  describe("useErrorHandler Hook", () => {
    it("should throw error from hook", () => {
      render(
        <ErrorBoundary>
          <ComponentWithErrorHandler shouldError={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    });

    it("should handle string errors", () => {
      render(
        <ErrorBoundary>
          <ComponentWithErrorHandler shouldError={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });
});
