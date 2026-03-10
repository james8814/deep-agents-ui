/**
 * Supporting Components Export Index
 *
 * Central export point for all supporting UI components.
 * Provides organized re-exports for easy importing.
 */

// Welcome and Onboarding
export { WelcomeScreen } from "./WelcomeScreen";
export type {} from "./WelcomeScreen";

// Theme Management
export { ThemeToggle } from "./ThemeToggle";
export type {} from "./ThemeToggle";

// Status and Indicators
export { StatusIndicator } from "./StatusIndicator";
export type {} from "./StatusIndicator";

// OPDCA Workflow
export { OPDCAStageDisplay, OPDCATimeline } from "./OPDCAStageDisplay";
export type {} from "./OPDCAStageDisplay";

// Loading States
export { LoadingSpinner, SkeletonLoader } from "./LoadingSpinner";
export type {} from "./LoadingSpinner";

// Error Handling
export { ErrorBoundary, useErrorHandler } from "./ErrorBoundary";
export type {} from "./ErrorBoundary";

// Existing Components (for reference)
export { ContextPanel } from "./ContextPanel";
export { ChatInterface } from "./ChatInterface";
export { ChatMessage } from "./ChatMessage";
export { ThreadList } from "./ThreadList";
export { TasksFilesSidebar } from "./TasksFilesSidebar";
export { Sidebar } from "./Sidebar";
export { default as SubAgentCard } from "./SubAgentCard";
export { ToolCallBox } from "./ToolCallBox";
