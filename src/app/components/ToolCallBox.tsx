"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  ChevronDown,
  Terminal,
  AlertCircle,
  Loader2,
  CircleCheckBigIcon,
  StopCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolCall, ActionRequest, ReviewConfig } from "@/app/types/types";
import { cn } from "@/lib/utils";
import { LoadExternalComponent } from "@langchain/langgraph-sdk/react-ui";
import { ToolApprovalInterrupt } from "@/app/components/ToolApprovalInterrupt";
import { ToolArgsRenderer } from "@/app/components/tool-renderers";
import { ViewImageResult } from "@/app/components/ViewImageResult";
import { getToolDisplayName } from "@/app/utils/toolNames";

interface ToolCallBoxProps {
  toolCall: ToolCall;
  uiComponent?: any;
  stream?: any;
  graphId?: string;
  actionRequest?: ActionRequest;
  reviewConfig?: ReviewConfig;
  onResume?: (value: any) => void;
  isLoading?: boolean;
}

export const ToolCallBox = React.memo<ToolCallBoxProps>(
  ({
    toolCall,
    uiComponent,
    stream,
    graphId,
    actionRequest,
    reviewConfig,
    onResume,
    isLoading,
  }) => {
    const [isExpanded, setIsExpanded] = useState(
      () => !!uiComponent || !!actionRequest
    );

    const { name, displayName, args, result, status } = useMemo(() => {
      const codeName = toolCall.name || "unknown_tool";
      return {
        name: codeName, // 保持代码名称，用于内部逻辑
        displayName: getToolDisplayName(codeName, codeName), // 可读的显示名称
        args: toolCall.args || {},
        result: toolCall.result,
        status: toolCall.status || "completed",
      };
    }, [toolCall]);

    const statusIcon = useMemo(() => {
      switch (status) {
        case "completed":
          return <CircleCheckBigIcon />;
        case "error":
          return (
            <AlertCircle
              size={14}
              className="text-destructive"
            />
          );
        case "pending":
          return (
            <Loader2
              size={14}
              className="animate-spin"
            />
          );
        case "interrupted":
          return (
            <StopCircle
              size={14}
              className="text-warning"
            />
          );
        default:
          return (
            <Terminal
              size={14}
              className="text-muted-foreground"
            />
          );
      }
    }, [status]);

    const toggleExpanded = useCallback(() => {
      setIsExpanded((prev) => !prev);
    }, []);

    const hasContent = result || Object.keys(args).length > 0;

    return (
      <div
        className={cn(
          "w-full overflow-hidden rounded-lg border-none shadow-none outline-none transition-colors duration-200 hover:bg-accent",
          isExpanded && hasContent && "bg-accent",
          status === "interrupted" &&
            "ring-warning/50 ring-2 ring-offset-1 ring-offset-background"
        )}
        role="region"
        aria-label={`工具调用: ${displayName}`}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleExpanded}
          aria-expanded={hasContent ? isExpanded : undefined}
          className={cn(
            "flex w-full items-center justify-between gap-2 border-none px-2 py-2 text-left shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-default"
          )}
          disabled={!hasContent}
        >
          <div className="flex w-full items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {statusIcon}
              <span className="text-[15px] font-medium tracking-[-0.6px] text-foreground">
                {displayName}
              </span>
            </div>
            {hasContent && (
              <ChevronDown
                size={14}
                className={cn(
                  "shrink-0 text-muted-foreground transition-transform duration-200",
                  isExpanded && "rotate-180"
                )}
              />
            )}
          </div>
        </Button>

        {hasContent && (
          <div
            className="grid transition-[grid-template-rows] duration-200 ease-out"
            aria-hidden={!isExpanded}
            style={{
              gridTemplateRows: isExpanded ? "1fr" : "0fr",
            }}
          >
            <div className="overflow-hidden">
              <div className="px-4 pb-4">
                {uiComponent && stream && graphId ? (
                  <div className="mt-4">
                    <LoadExternalComponent
                      key={uiComponent.id}
                      stream={stream}
                      message={uiComponent}
                      namespace={graphId}
                      meta={{ status, args, result: result ?? "No Result Yet" }}
                    />
                  </div>
                ) : actionRequest && onResume ? (
                  <div className="mt-4">
                    <ToolApprovalInterrupt
                      actionRequest={actionRequest}
                      reviewConfig={reviewConfig}
                      onResume={onResume}
                      isLoading={isLoading}
                    />
                  </div>
                ) : (
                  <>
                    {Object.keys(args).length > 0 && (
                      <div className="mt-4">
                        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Arguments
                        </h4>
                        <ToolArgsRenderer
                          name={name}
                          args={args}
                        />
                      </div>
                    )}
                    {result && (
                      <div className="mt-4">
                        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Result
                        </h4>
                        {name === "view_image" &&
                        typeof result === "object" &&
                        result !== null ? (
                          <ViewImageResult result={result} />
                        ) : (
                          <pre className="m-0 overflow-x-auto whitespace-pre-wrap break-all rounded-sm border border-border bg-muted/40 p-2 font-mono text-xs leading-7 text-foreground">
                            {typeof result === "string"
                              ? result
                              : JSON.stringify(result, null, 2)}
                          </pre>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

ToolCallBox.displayName = "ToolCallBox";
