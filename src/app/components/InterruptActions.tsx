"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, MessageSquare } from "lucide-react";

interface InterruptActionsProps {
  onApprove: (value: unknown) => void;
  onReject: (message?: string) => void;
  toolName?: string;
}

// 工具特定的按钮文案配置
const TOOL_CONFIG: Record<
  string,
  {
    approveLabel: string;
    rejectLabel: string;
    feedbackLabel: string;
    feedbackPlaceholder: string;
    description: string;
  }
> = {
  submit_deliverable: {
    approveLabel: "验收通过",
    rejectLabel: "需要修改",
    feedbackLabel: "修改意见",
    feedbackPlaceholder: "请描述需要修改的地方...",
    description: "产物验收",
  },
  // 默认配置（兼容其他可能的 HIL 工具）
  default: {
    approveLabel: "批准",
    rejectLabel: "拒绝执行",
    feedbackLabel: "您的回复",
    feedbackPlaceholder: "请输入您的反馈...",
    description: "操作确认",
  },
};

export const InterruptActions = React.memo<InterruptActionsProps>(
  ({ onApprove, onReject, toolName }) => {
    const [showFeedback, setShowFeedback] = useState(false);
    const [feedback, setFeedback] = useState("");

    // 获取当前工具的配置
    const config = TOOL_CONFIG[toolName || ""] || TOOL_CONFIG.default;

    const handleApprove = () => {
      if (feedback.trim()) {
        // Approve with feedback message
        onApprove({
          decisions: [
            {
              type: "approve",
              message: feedback.trim(),
            },
          ],
        });
      } else {
        // Simple approve without feedback
        onApprove({
          decisions: [{ type: "approve" }],
        });
      }
      setShowFeedback(false);
      setFeedback("");
    };

    const handleReject = () => {
      // 对于 submit_deliverable，reject 时传递用户的修改意见
      onReject(feedback.trim() || undefined);
      setShowFeedback(false);
      setFeedback("");
    };

    const toggleFeedback = () => {
      setShowFeedback(!showFeedback);
    };

    return (
      <div className="mt-3 space-y-3">
        {/* 工具描述标签 */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="bg-primary/10 rounded px-2 py-0.5 text-primary">
            {config.description}
          </span>
          <span>等待您的确认</span>
        </div>

        {showFeedback && (
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <label className="mb-2 block text-xs font-medium text-foreground">
              {config.feedbackLabel} (可选)
            </label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={config.feedbackPlaceholder}
              className="text-sm"
              rows={3}
            />
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowFeedback(false);
                  setFeedback("");
                }}
              >
                取消
              </Button>
              <Button
                size="sm"
                onClick={handleApprove}
                className="gap-1"
              >
                <Check size={14} />
                {config.approveLabel}
              </Button>
            </div>
          </div>
        )}

        {!showFeedback && (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={toggleFeedback}
              className="gap-1"
            >
              <MessageSquare size={14} />
              添加备注
            </Button>
            <Button
              size="sm"
              onClick={handleApprove}
              className="gap-1 bg-green-600 text-white hover:bg-green-700"
            >
              <Check size={14} />
              {config.approveLabel}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleReject}
              className="gap-1"
            >
              <X size={14} />
              {config.rejectLabel}
            </Button>
          </div>
        )}
      </div>
    );
  }
);

InterruptActions.displayName = "InterruptActions";
