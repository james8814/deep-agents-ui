"use client";

import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  FormEvent,
  useEffect,
} from "react";
import { Button } from "@/components/ui/button";
import { Square, ArrowUp, Maximize2, Minimize2, Clock } from "lucide-react";
import { FileUploadZone, UploadButton, UploadedFile } from "./FileUploadZone";
import { cn } from "@/lib/utils";

interface InputAreaProps {
  input: string;
  onInputChange: (value: string) => void;
  attachedFiles: UploadedFile[];
  onFilesChange: (
    files: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])
  ) => void;
  onSubmit: (e?: FormEvent) => void;
  onStop: () => void;
  isLoading: boolean;
  isDisabled: boolean;
  onUploadClick: () => void;
  uploadInputRef: React.RefObject<HTMLInputElement>;
  executionTime?: number | null;
  sendStatus?: "idle" | "sending" | "error";
  inputExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  minHeight?: number;
  maxHeight?: number;
  autoMaxHeight?: number;
  lineHeight?: number;
  paddingY?: number;
}

interface InputAreaState {
  charCount: number;
  hasContent: boolean;
  canSubmit: boolean;
  isExpandable: boolean;
}

export const InputArea = React.memo<InputAreaProps>(
  ({
    input,
    onInputChange,
    attachedFiles,
    onFilesChange,
    onSubmit,
    onStop,
    isLoading,
    isDisabled,
    onUploadClick,
    uploadInputRef,
    executionTime,
    sendStatus = "idle",
    inputExpanded = false,
    onExpandedChange,
    minHeight = 48,
    maxHeight = 216,
    autoMaxHeight = 216,
    lineHeight = 24,
    paddingY = 24,
  }) => {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const [expandedHeight, setExpandedHeight] = useState<number | null>(null);
    const [isFocused, setIsFocused] = useState(false);

    // Calculate state
    const state: InputAreaState = useMemo(() => {
      const charCount = input.length;
      const hasContent = input.trim().length > 0 || attachedFiles.length > 0;
      const canSubmit = hasContent && !isLoading && !isDisabled;
      const isExpandable = input.trim().length > 0;

      return {
        charCount,
        hasContent,
        canSubmit,
        isExpandable,
      };
    }, [input, attachedFiles.length, isLoading, isDisabled]);

    // Auto-resize textarea
    useEffect(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      if (inputExpanded && expandedHeight) {
        textarea.style.height = `${expandedHeight}px`;
        textarea.style.overflowY = "auto";
      } else {
        textarea.style.height = "auto";
        const newHeight = Math.min(
          Math.max(textarea.scrollHeight, minHeight),
          autoMaxHeight
        );
        textarea.style.height = `${newHeight}px`;
        textarea.style.overflowY =
          textarea.scrollHeight > autoMaxHeight ? "auto" : "hidden";
      }
    }, [input, inputExpanded, expandedHeight, minHeight, autoMaxHeight]);

    // Calculate expanded height
    useEffect(() => {
      if (inputExpanded && textareaRef.current?.parentElement?.parentElement) {
        const containerHeight =
          textareaRef.current.parentElement.parentElement.clientHeight;
        setExpandedHeight(Math.max(containerHeight - 100, minHeight));
      } else {
        setExpandedHeight(null);
      }
    }, [inputExpanded, minHeight]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (isDisabled) return;

        // Send on Cmd/Ctrl + Enter (multi-line friendly)
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          if (state.canSubmit) {
            onSubmit();
          }
        }
        // Send on Enter only (single line)
        else if (e.key === "Enter" && !e.shiftKey && !inputExpanded) {
          e.preventDefault();
          if (state.canSubmit) {
            onSubmit();
          }
        }
      },
      [isDisabled, state.canSubmit, onSubmit, inputExpanded]
    );

    const handleToggleExpand = useCallback(() => {
      if (!state.isExpandable) return;
      const newExpanded = !inputExpanded;
      onExpandedChange?.(newExpanded);

      // Analytics
      if (typeof window !== "undefined" && (window as any).gtag) {
        (window as any).gtag("event", "input_expand_toggled", {
          expanded: newExpanded,
        });
      }
    }, [state.isExpandable, inputExpanded, onExpandedChange]);

    // Determine button state
    const buttonVariant = isLoading ? "destructive" : "default";
    const buttonDisabled =
      !isLoading && (!state.canSubmit || sendStatus === "error");
    const buttonLabel = isLoading ? "Stop" : "Send";
    const buttonIcon = isLoading ? (
      <Square
        size={12}
        className="mr-1"
      />
    ) : (
      <ArrowUp
        size={14}
        className="mr-1"
      />
    );

    const formatExecutionTime = (
      seconds: number | undefined | null
    ): string => {
      if (!seconds) return "";
      if (seconds < 60) return `${seconds}s`;
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}m ${secs}s`;
    };

    return (
      <div
        className={cn(
          "mx-auto flex w-full max-w-[1024px] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-sm transition-all duration-200 ease-out"
        )}
      >
        <form
          onSubmit={onSubmit}
          className="flex flex-col"
        >
          {/* File Upload Zone */}
          <FileUploadZone
            files={attachedFiles}
            onFilesChange={onFilesChange}
            disabled={isLoading || isDisabled}
            inputRef={uploadInputRef}
          />

          {/* Textarea with focus indication */}
          <div className={cn("transition-colors", isFocused && "bg-accent/30")}>
            <textarea
              ref={textareaRef}
              name="message"
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={
                isLoading
                  ? "Running..."
                  : isDisabled
                  ? "Agent is waiting for approval above ↑"
                  : "Write your message... (Cmd/Ctrl+Enter or Shift+Enter for newline)"
              }
              disabled={isDisabled}
              className={cn(
                "w-full resize-none border-0 bg-transparent px-4 py-3 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground/50",
                "transition-colors",
                isDisabled && "cursor-not-allowed opacity-50",
                isFocused && "bg-accent/10"
              )}
              rows={1}
              aria-label="Message input"
              aria-describedby={
                state.charCount > 500 ? "char-count" : undefined
              }
            />
          </div>

          {/* Toolbar: Upload + Expand + Status + Send */}
          <div className="flex items-center justify-between border-t border-border/50 px-3 py-2">
            {/* Left: Upload + Expand button + Keyboard hint */}
            <div className="flex items-center gap-2">
              <UploadButton
                onClick={onUploadClick}
                disabled={isLoading || isDisabled}
              />

              <button
                type="button"
                onClick={handleToggleExpand}
                disabled={!state.isExpandable}
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-all",
                  "hover:bg-accent hover:text-foreground",
                  "disabled:cursor-not-allowed disabled:opacity-30",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  inputExpanded && "bg-accent text-foreground"
                )}
                title={
                  inputExpanded
                    ? "Collapse to compact mode (Cmd/Ctrl+Enter to send)"
                    : "Expand to fullscreen (Cmd/Ctrl+Enter to send)"
                }
                aria-label={inputExpanded ? "Collapse input" : "Expand input"}
                aria-pressed={inputExpanded}
              >
                {inputExpanded ? (
                  <Minimize2 size={14} />
                ) : (
                  <Maximize2 size={14} />
                )}
              </button>

              <span className="text-[10px] text-muted-foreground">
                {inputExpanded ? "Cmd/Ctrl+Enter" : "Shift+Enter"}
              </span>
            </div>

            {/* Center: Execution time + Status indicator */}
            {executionTime !== null && executionTime !== undefined && (
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <Clock size={12} />
                <span>{formatExecutionTime(executionTime)}</span>
                {sendStatus === "sending" && (
                  <span className="ml-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                )}
                {sendStatus === "error" && (
                  <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                )}
              </div>
            )}

            {/* Right: Char count + Send/Stop button */}
            <div className="flex items-center gap-3">
              {state.charCount > 500 && (
                <span
                  id="char-count"
                  className="text-[10px] tabular-nums text-muted-foreground"
                >
                  {state.charCount.toLocaleString()}
                </span>
              )}

              <Button
                type={isLoading ? "button" : "submit"}
                variant={buttonVariant}
                size="sm"
                onClick={isLoading ? onStop : undefined}
                disabled={buttonDisabled}
                className={cn(
                  "h-7 px-3 text-xs transition-all duration-150",
                  isLoading && "hover:-translate-y-px hover:shadow-sm",
                  buttonDisabled &&
                    "pointer-events-none bg-muted text-muted-foreground disabled:opacity-100"
                )}
                aria-label={
                  isLoading
                    ? "Stop execution"
                    : buttonDisabled
                    ? "Type a message to send"
                    : "Send message"
                }
                aria-busy={isLoading}
                title={
                  buttonDisabled
                    ? "Type a message to send"
                    : isLoading
                    ? "Click to stop execution"
                    : undefined
                }
              >
                {buttonIcon}
                {buttonLabel}
              </Button>
            </div>
          </div>
        </form>
      </div>
    );
  }
);

InputArea.displayName = "InputArea";
