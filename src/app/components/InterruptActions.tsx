"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, MessageSquare } from "lucide-react";

interface InterruptActionsProps {
  onApprove: (value: unknown) => void;
  onReject: () => void;
  approvalOptions?: { label: string; value: unknown }[];
}

export const InterruptActions = React.memo<InterruptActionsProps>(
  ({ onApprove, onReject, approvalOptions }) => {
    const [showFeedback, setShowFeedback] = useState(false);
    const [feedback, setFeedback] = useState("");

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
      onReject();
      setShowFeedback(false);
      setFeedback("");
    };

    const toggleFeedback = () => {
      setShowFeedback(!showFeedback);
    };

    return (
      <div className="mt-3 space-y-3">
        {showFeedback && (
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <label className="mb-2 block text-xs font-medium text-foreground">
              您的回复 (可选)
            </label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="回答 Agent 的澄清问题，或提供补充信息..."
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
                className="gap-1 bg-green-600 text-white hover:bg-green-700"
              >
                <Check size={14} />
                {feedback.trim() ? "批准并发送" : "批准"}
              </Button>
            </div>
          </div>
        )}

        {!showFeedback && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={toggleFeedback}
              className="gap-1"
            >
              <MessageSquare size={14} />
              回复
            </Button>
            <Button
              size="sm"
              onClick={handleApprove}
              className="gap-1 bg-green-600 text-white hover:bg-green-700"
            >
              <Check size={14} />
              批准
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleReject}
              className="gap-1"
            >
              <X size={14} />
              拒绝
            </Button>
          </div>
        )}
      </div>
    );
  }
);

InterruptActions.displayName = "InterruptActions";
