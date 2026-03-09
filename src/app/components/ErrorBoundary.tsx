"use client";

import React, { ReactNode, ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactElement;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
  level?: "page" | "section" | "inline";
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
}

/**
 * ErrorBoundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 *
 * Features:
 * - Error recovery with reset capability
 * - Development error details with stack trace
 * - Error logging support
 * - Multiple severity levels (page, section, inline)
 * - Accessible error messages
 *
 * Accessibility:
 * - WCAG 2.1 AA compliant
 * - Proper ARIA roles and labels
 * - Keyboard navigation support
 * - Clear error messaging
 *
 * @example
 * ```tsx
 * <ErrorBoundary level="section" onError={logError}>
 *   <ComplexComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private previousResetKeys: (string | number)[] = [];

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: this.generateErrorId(),
    };
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState(
      {
        errorInfo,
        errorId: this.generateErrorId(),
      },
      () => {
        this.props.onError?.(error, errorInfo);
        this.logError(error, errorInfo);
      }
    );
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    // Auto-reset on props change if enabled
    if (resetOnPropsChange && hasError && prevProps !== this.props) {
      this.resetErrorBoundary();
      return;
    }

    // Reset if resetKeys changed
    if (resetKeys && hasError) {
      if (
        JSON.stringify(resetKeys) !==
        JSON.stringify(this.previousResetKeys)
      ) {
        this.resetErrorBoundary();
        this.previousResetKeys = resetKeys;
      }
    }
  }

  private logError(error: Error, errorInfo: React.ErrorInfo): void {
    // In development, log to console
    if (process.env.NODE_ENV === "development") {
      console.error("Error caught by ErrorBoundary:", error);
      console.error("Error details:", errorInfo.componentStack);
    }

    // In production, send to error tracking service
    if (process.env.NODE_ENV === "production") {
      // Example: Sentry, LogRocket, etc.
      try {
        // Send to your error tracking service
        // await trackError({ error, errorInfo, errorId: this.state.errorId });
      } catch (e) {
        console.error("Failed to log error:", e);
      }
    }
  }

  private resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: this.generateErrorId(),
    });
  };

  private handleRefresh = (): void => {
    this.resetErrorBoundary();
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    const { hasError, error, errorInfo, errorId } = this.state;
    const { children, fallback, level = "page" } = this.props;

    if (!hasError) {
      return children;
    }

    // Custom fallback
    if (fallback) {
      return fallback;
    }

    // Default fallback UI
    const isPage = level === "page";
    const isSection = level === "section";

    return (
      <div
        className={cn(
          "flex flex-col gap-4",
          isPage && "h-screen items-center justify-center bg-background px-4",
          isSection && "rounded-lg border border-destructive/50 bg-destructive/5 p-6",
          !isPage && !isSection && "rounded p-3 text-sm"
        )}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        {/* Header */}
        <div className="flex items-start gap-3">
          <AlertCircle
            className={cn(
              "flex-shrink-0 text-destructive",
              isPage ? "h-8 w-8 mt-1" : "h-5 w-5 mt-0.5"
            )}
            aria-hidden="true"
          />
          <div className="flex-1">
            <h2
              className={cn(
                "font-semibold text-destructive",
                isPage && "text-2xl",
                isSection && "text-lg",
                !isPage && !isSection && "text-base"
              )}
            >
              Something went wrong
            </h2>
            <p
              className={cn(
                "mt-1 text-muted-foreground",
                isPage || isSection ? "text-base" : "text-sm"
              )}
            >
              {error?.message || "An unexpected error occurred"}
            </p>
          </div>
        </div>

        {/* Error Details (Development only) */}
        {process.env.NODE_ENV === "development" && errorInfo && (
          <details className="mt-4 w-full cursor-pointer rounded bg-muted p-3 text-xs">
            <summary className="font-mono font-semibold text-muted-foreground">
              Error Stack Trace (Development only)
            </summary>
            <pre
              className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-destructive"
              aria-label="Error stack trace"
            >
              {errorInfo.componentStack}
            </pre>
          </details>
        )}

        {/* Error ID */}
        {process.env.NODE_ENV === "production" && (
          <p className="text-xs text-muted-foreground">
            Error ID: <code className="font-mono">{errorId}</code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(errorId);
              }}
              className="ml-2 text-primary hover:underline"
              aria-label="Copy error ID"
            >
              (Copy)
            </button>
          </p>
        )}

        {/* Actions */}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={this.handleRefresh}
            variant="outline"
            className="gap-2"
            aria-label="Try again"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>

          {isPage && (
            <Button
              onClick={this.handleReload}
              variant="outline"
              className="gap-2"
              aria-label="Reload page"
            >
              <RefreshCw className="h-4 w-4" />
              Reload Page
            </Button>
          )}

          <a
            href="/"
            className={cn(
              "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors",
              "text-primary-foreground bg-primary hover:bg-primary/90",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            )}
          >
            Go Home
          </a>
        </div>

        {/* Help text */}
        <p className="text-xs text-muted-foreground">
          If this problem persists, please{" "}
          <a
            href="https://support.example.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            contact support
          </a>
        </p>
      </div>
    );
  }
}

/**
 * useErrorHandler Hook
 *
 * Use this hook to manually handle errors within a functional component.
 * Requires ErrorBoundary wrapper.
 *
 * @example
 * ```tsx
 * const handleError = useErrorHandler();
 *
 * try {
 *   // something
 * } catch (error) {
 *   handleError(error);
 * }
 * ```
 */
export function useErrorHandler() {
  return (error: Error | string) => {
    throw typeof error === "string" ? new Error(error) : error;
  };
}
