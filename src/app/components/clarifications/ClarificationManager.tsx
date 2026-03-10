"use client";

import React, { useState } from "react";
import { MissingInfoForm } from "./MissingInfoForm";
import { AmbiguousRequirementDialog } from "./AmbiguousRequirementDialog";
import { ApproachChoiceDialog } from "./ApproachChoiceDialog";
import { RiskConfirmationAlert } from "./RiskConfirmationAlert";
import { SuggestionApprovalCard } from "./SuggestionApprovalCard";
import styles from "./clarifications.module.css";

interface ClarificationData {
  clarification_id: string;
  clarification_type:
    | "missing_info"
    | "ambiguous_requirement"
    | "approach_choice"
    | "risk_confirmation"
    | "suggestion_approval";
  title: string;
  description: string;
  context: Record<string, unknown>;
}

interface ClarificationManagerProps {
  clarification: ClarificationData;
  onSubmit: (clarificationId: string, response: unknown) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ClarificationManager: React.FC<ClarificationManagerProps> = ({
  clarification,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [error, setError] = useState<string>("");

  const handleSubmit = (response: unknown) => {
    try {
      setError("");
      onSubmit(clarification.clarification_id, response);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "提交失败，请重试";
      setError(errorMsg);
      console.error("[ClarificationManager] Submission error:", err);
    }
  };

  const renderComponent = () => {
    const { clarification_type, title, description, context } = clarification;

    const commonProps = {
      clarificationId: clarification.clarification_id,
      title,
      description,
      onSubmit: handleSubmit,
      onCancel,
    };

    switch (clarification_type) {
      case "missing_info":
        return (
          <MissingInfoForm
            {...commonProps}
            context={context as any}
          />
        );

      case "ambiguous_requirement":
        return (
          <AmbiguousRequirementDialog
            {...commonProps}
            context={context as any}
          />
        );

      case "approach_choice":
        return (
          <ApproachChoiceDialog
            {...commonProps}
            context={context as any}
          />
        );

      case "risk_confirmation":
        return (
          <RiskConfirmationAlert
            {...commonProps}
            context={context as any}
          />
        );

      case "suggestion_approval":
        return (
          <SuggestionApprovalCard
            {...commonProps}
            context={context as any}
          />
        );

      default:
        return (
          <div className={styles.errorState}>
            <p>Unknown clarification type: {clarification_type}</p>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className={styles.clarificationContainer}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Loading clarification...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className={styles.globalError}>
          <p>{error}</p>
          <button
            onClick={() => setError("")}
            className={styles.closeError}
          >
            ×
          </button>
        </div>
      )}
      {renderComponent()}
    </div>
  );
};

ClarificationManager.displayName = "ClarificationManager";
