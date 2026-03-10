/**
 * Type Definitions for Enhanced Components
 * Provides strict typing for Day 3 enhancements
 */

/**
 * Input Area Component Types
 */
export interface InputAreaState {
  /** Character count of input */
  charCount: number;
  /** Whether input has content */
  hasContent: boolean;
  /** Whether submit is allowed */
  canSubmit: boolean;
  /** Whether input can be expanded */
  isExpandable: boolean;
}

export type SendStatus = "idle" | "sending" | "error";

export interface InputAreaProps {
  /** Current input value */
  input: string;
  /** Callback when input changes */
  onInputChange: (value: string) => void;
  /** Attached files */
  attachedFiles: Array<{
    name: string;
    status: "success" | "pending" | "error";
    path?: string;
  }>;
  /** Callback when files change */
  onFilesChange: (files: any[]) => void;
  /** Callback for form submit */
  onSubmit: (e?: React.FormEvent) => void;
  /** Callback to stop execution */
  onStop: () => void;
  /** Whether currently loading */
  isLoading: boolean;
  /** Whether input is disabled */
  isDisabled: boolean;
  /** Callback for upload button click */
  onUploadClick: () => void;
  /** Ref for file input */
  uploadInputRef: React.RefObject<HTMLInputElement>;
  /** Execution time in seconds */
  executionTime?: number | null;
  /** Send status indicator */
  sendStatus?: SendStatus;
  /** Whether input is expanded */
  inputExpanded?: boolean;
  /** Callback when expand state changes */
  onExpandedChange?: (expanded: boolean) => void;
  /** Minimum height in pixels */
  minHeight?: number;
  /** Maximum height in pixels */
  maxHeight?: number;
  /** Auto-max height before scrolling */
  autoMaxHeight?: number;
  /** Line height in pixels */
  lineHeight?: number;
  /** Vertical padding in pixels */
  paddingY?: number;
}

/**
 * Tool Call Box Enhanced Types
 */
export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface RiskBadgeConfig {
  /** Risk severity level */
  level: RiskLevel;
  /** Display label for badge */
  label: string;
  /** Optional description for tooltip */
  description?: string;
}

export type ToolStatus = "pending" | "completed" | "error" | "interrupted";

export interface ToolCall {
  /** Unique identifier */
  id: string;
  /** Tool name */
  name: string;
  /** Tool arguments */
  args: Record<string, unknown>;
  /** Tool result */
  result?: string | Record<string, unknown>;
  /** Current status */
  status: ToolStatus;
}

export interface ToolCallBoxEnhancedProps {
  /** Tool call data */
  toolCall: ToolCall;
  /** Optional UI component from framework */
  uiComponent?: any;
  /** Stream data */
  stream?: any;
  /** Graph ID for external components */
  graphId?: string;
  /** Action request for approval */
  actionRequest?: any;
  /** Review configuration */
  reviewConfig?: any;
  /** Resume callback */
  onResume?: (value: any) => void;
  /** Whether currently loading */
  isLoading?: boolean;
  /** Risk level override */
  riskLevel?: RiskLevel;
  /** Execution time in milliseconds */
  executionTime?: number;
  /** Show copy button for arguments */
  showCopyButton?: boolean;
}

/**
 * Message List Enhanced Types
 */
export interface CodeBlockProps {
  /** Code content */
  code: string;
  /** Programming language */
  language?: string;
  /** Original filename */
  filename?: string;
}

export interface CollapsibleMessageProps {
  /** Message content */
  content: string;
  /** Maximum lines before collapsing */
  maxLines?: number;
}

export interface MessageItemEnhancedProps {
  /** Message data */
  message: any;
  /** Tool calls in message */
  toolCalls?: ToolCall[];
  /** Whether loading */
  isLoading?: boolean;
  /** Whether streaming */
  isStreaming?: boolean;
  /** Show avatar */
  showAvatar?: boolean;
  /** Edit callback */
  onEditAndResend?: (content: string) => void;
  /** Tool call click callback */
  onViewToolCall?: (toolCall: ToolCall) => void;
}

export interface MessageListEnhancedProps {
  /** Messages to display */
  messages: any[];
  /** Whether loading */
  isLoading?: boolean;
  /** Edit callback */
  onEditAndResend?: (content: string) => void;
}

/**
 * Execution Time Types
 */
export interface ExecutionMetrics {
  /** Start time in milliseconds */
  startTime: number;
  /** End time in milliseconds */
  endTime?: number;
  /** Elapsed time in milliseconds */
  elapsedMs: number;
  /** Formatted time string */
  formatted: string;
}

/**
 * Risk Assessment Types
 */
export interface RiskAssessment {
  /** Tool name */
  tool: string;
  /** Risk level */
  level: RiskLevel;
  /** Risk description */
  description?: string;
  /** Whether user approval is required */
  requiresApproval: boolean;
  /** Custom risk metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Analytics Event Types
 */
export interface AnalyticsEvent {
  /** Event name */
  name: string;
  /** Event category */
  category?: string;
  /** Event properties */
  properties: Record<string, any>;
  /** Timestamp */
  timestamp: number;
}

export interface InputAnalytics extends AnalyticsEvent {
  name:
    | "input_expand_toggled"
    | "input_focused"
    | "message_sent"
    | "message_cancelled";
}

export interface ToolAnalytics extends AnalyticsEvent {
  name: "tool_call_expanded" | "tool_args_copied" | "tool_approved";
}

export interface MessageAnalytics extends AnalyticsEvent {
  name: "code_block_copied" | "message_expanded" | "message_collapsed";
}

/**
 * Keyboard Shortcut Types
 */
export interface KeyboardShortcut {
  /** Keys required */
  keys: string[];
  /** Description */
  description: string;
  /** Whether to prevent default */
  preventDefault?: boolean;
  /** Callback function */
  callback: () => void;
}

/**
 * Accessibility Types
 */
export interface A11yLabel {
  /** Primary label */
  label: string;
  /** Description for screen readers */
  description?: string;
  /** Hint text */
  hint?: string;
}

/**
 * Status Indicator Types
 */
export interface StatusIndicator {
  /** Status type */
  type: "info" | "success" | "warning" | "error";
  /** Status message */
  message: string;
  /** Whether to show icon */
  showIcon?: boolean;
  /** Duration in ms (0 for persistent) */
  duration?: number;
}

/**
 * Focus Management Types
 */
export interface FocusableElement {
  /** Element reference */
  element: HTMLElement | null;
  /** Tab order priority */
  tabIndex: number;
  /** Is focusable */
  isFocusable: boolean;
}

/**
 * Theme and Styling Types
 */
export interface ComponentTheme {
  /** Primary color class */
  primary: string;
  /** Accent color class */
  accent: string;
  /** Muted color class */
  muted: string;
  /** Border color class */
  border: string;
}

/**
 * Validation Types
 */
export interface ValidationError {
  /** Field name */
  field: string;
  /** Error message */
  message: string;
  /** Error code */
  code: string;
}

/**
 * Feature Flag Types
 */
export type FeatureFlagKey =
  | "ENHANCED_INPUT_AREA"
  | "ENHANCED_TOOL_CALL_BOX"
  | "ENHANCED_MESSAGE_LIST"
  | "RISK_BADGES"
  | "EXECUTION_TIME"
  | "CODE_COPY_BUTTON";

export interface FeatureFlags {
  [key: string]: boolean;
}

/**
 * Performance Metrics Types
 */
export interface ComponentMetrics {
  /** Component name */
  name: string;
  /** Render time in ms */
  renderTime: number;
  /** Interaction response time in ms */
  interactionTime: number;
  /** Memory usage in bytes */
  memoryUsage?: number;
  /** FPS during interaction */
  fps?: number;
}

/**
 * Configuration Types
 */
export interface ComponentConfig {
  /** Enable debug logging */
  debug?: boolean;
  /** Enable analytics */
  analytics?: boolean;
  /** Enable accessibility features */
  a11y?: boolean;
  /** Custom theme */
  theme?: ComponentTheme;
  /** Locale for formatting */
  locale?: string;
}
