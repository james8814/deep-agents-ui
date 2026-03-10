"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ChevronDown } from "lucide-react";
import styles from "./clarifications.module.css";

interface RiskConfirmationAlertProps {
  clarificationId: string;
  title: string;
  description: string;
  context: {
    risk_level: "low" | "medium" | "high" | "critical";
    risk_description: string;
    mitigation_steps?: string[];
  };
  onSubmit: (response: boolean) => void;
  onCancel: () => void;
}

export const RiskConfirmationAlert: React.FC<RiskConfirmationAlertProps> = ({
  clarificationId,
  title,
  description,
  context,
  onSubmit,
  onCancel,
}) => {
  const [understood, setUnderstood] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = () => {
    if (!understood) return;
    setIsSubmitting(true);
    setTimeout(() => {
      onSubmit(true);
      setIsSubmitting(false);
    }, 300);
  };

  const handleReject = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      onSubmit(false);
      setIsSubmitting(false);
    }, 300);
  };

  return (
    <div className={styles.clarificationContainer}>
      <div className={styles.riskAlertContent}>
        <div className={styles.riskBanner}>
          <div className={styles.riskHeader}>
            <AlertTriangle size={20} />
            <div className={styles.riskTitleGroup}>
              <h3 className={styles.clarificationTitle}>{title}</h3>
              <span className={styles.riskLevel}>
                {context.risk_level.toUpperCase()}
              </span>
            </div>
          </div>

          {description && (
            <p className={styles.clarificationDescription}>{description}</p>
          )}
        </div>

        <div className={styles.riskDescription}>
          <p>{context.risk_description}</p>
        </div>

        {context.mitigation_steps && context.mitigation_steps.length > 0 && (
          <div className={styles.mitigationSection}>
            <button
              onClick={() => setExpanded(!expanded)}
              className={styles.expandButton}
              disabled={isSubmitting}
            >
              <span>风险缓解措施</span>
              <ChevronDown
                size={16}
                className={`${styles.chevron} ${
                  expanded ? styles.chevronExpanded : ""
                }`}
              />
            </button>

            {expanded && (
              <div className={styles.expandedContent}>
                <ol className={styles.mitigationList}>
                  {context.mitigation_steps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        <div className={styles.checkboxSection}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={understood}
              onChange={(e) => setUnderstood(e.target.checked)}
              disabled={isSubmitting}
            />
            <span>我已了解上述风险，愿意继续</span>
          </label>
        </div>

        <div className={styles.actionButtons}>
          <Button
            variant="outline"
            onClick={handleReject}
            disabled={isSubmitting}
          >
            {isSubmitting ? "处理中..." : "拒绝执行"}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!understood || isSubmitting}
            className={styles.confirmButton}
          >
            {isSubmitting ? "确认中..." : "确认并继续"}
          </Button>
        </div>
      </div>
    </div>
  );
};

RiskConfirmationAlert.displayName = "RiskConfirmationAlert";
