"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown } from "lucide-react";
import styles from "./clarifications.module.css";

interface SuggestionApprovalCardProps {
  clarificationId: string;
  title: string;
  description: string;
  context: {
    suggestion_text: string;
    rationale?: string;
    expected_benefit?: string;
    effort?: string;
  };
  onSubmit: (
    response: boolean | { approved: false; feedback: string }
  ) => void;
  onCancel: () => void;
}

export const SuggestionApprovalCard: React.FC<SuggestionApprovalCardProps> = ({
  clarificationId,
  title,
  description,
  context,
  onSubmit,
  onCancel,
}) => {
  const [decision, setDecision] = useState<"pending" | "approve" | "revise">(
    "pending"
  );
  const [feedback, setFeedback] = useState("");
  const [expandedSection, setExpandedSection] = useState<
    "rationale" | "benefit" | "effort" | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApprove = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      onSubmit(true);
      setIsSubmitting(false);
    }, 300);
  };

  const handleRevise = () => {
    if (!feedback.trim()) {
      setDecision("revise");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      onSubmit({ approved: false, feedback: feedback.trim() });
      setIsSubmitting(false);
    }, 300);
  };

  return (
    <div className={styles.clarificationContainer}>
      <div className={styles.suggestionCardContent}>
        <div className={styles.clarificationHeader}>
          <h3 className={styles.clarificationTitle}>{title}</h3>
          {description && (
            <p className={styles.clarificationDescription}>{description}</p>
          )}
        </div>

        <div className={styles.suggestionCard}>
          <div className={styles.suggestionText}>
            {context.suggestion_text}
          </div>

          <div className={styles.detailsContainer}>
            {context.rationale && (
              <div className={styles.detailSection}>
                <button
                  onClick={() =>
                    setExpandedSection(
                      expandedSection === "rationale" ? null : "rationale"
                    )
                  }
                  className={styles.expandButton}
                  disabled={isSubmitting}
                >
                  <span>方案原因</span>
                  <ChevronDown
                    size={16}
                    className={`${styles.chevron} ${
                      expandedSection === "rationale"
                        ? styles.chevronExpanded
                        : ""
                    }`}
                  />
                </button>
                {expandedSection === "rationale" && (
                  <div className={styles.expandedContent}>
                    <p>{context.rationale}</p>
                  </div>
                )}
              </div>
            )}

            {context.expected_benefit && (
              <div className={styles.detailSection}>
                <button
                  onClick={() =>
                    setExpandedSection(
                      expandedSection === "benefit" ? null : "benefit"
                    )
                  }
                  className={styles.expandButton}
                  disabled={isSubmitting}
                >
                  <span>预期效果</span>
                  <ChevronDown
                    size={16}
                    className={`${styles.chevron} ${
                      expandedSection === "benefit"
                        ? styles.chevronExpanded
                        : ""
                    }`}
                  />
                </button>
                {expandedSection === "benefit" && (
                  <div className={styles.expandedContent}>
                    <p>{context.expected_benefit}</p>
                  </div>
                )}
              </div>
            )}

            {context.effort && (
              <div className={styles.detailSection}>
                <button
                  onClick={() =>
                    setExpandedSection(
                      expandedSection === "effort" ? null : "effort"
                    )
                  }
                  className={styles.expandButton}
                  disabled={isSubmitting}
                >
                  <span>所需工作量</span>
                  <ChevronDown
                    size={16}
                    className={`${styles.chevron} ${
                      expandedSection === "effort"
                        ? styles.chevronExpanded
                        : ""
                    }`}
                  />
                </button>
                {expandedSection === "effort" && (
                  <div className={styles.expandedContent}>
                    <p>{context.effort}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {decision === "revise" && (
          <div className={styles.revisionForm}>
            <label className={styles.feedbackLabel}>
              您的修改意见
            </label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="请说明您希望如何修改或改进此建议..."
              rows={3}
              disabled={isSubmitting}
              className={styles.formInput}
            />
          </div>
        )}

        <div className={styles.actionButtons}>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            取消
          </Button>

          {decision === "pending" ? (
            <>
              <Button
                variant="outline"
                onClick={() => setDecision("revise")}
                disabled={isSubmitting}
              >
                修改
              </Button>
              <Button
                onClick={handleApprove}
                disabled={isSubmitting}
                className={styles.primaryButton}
              >
                {isSubmitting ? "批准中..." : "批准"}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setDecision("pending")}
                disabled={isSubmitting}
              >
                返回
              </Button>
              <Button
                onClick={handleRevise}
                disabled={!feedback.trim() || isSubmitting}
                className={styles.primaryButton}
              >
                {isSubmitting ? "提交中..." : "提交修改"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

SuggestionApprovalCard.displayName = "SuggestionApprovalCard";
