"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import styles from "./clarifications.module.css";

interface Option {
  id: string;
  text: string;
  explanation?: string;
}

interface AmbiguousRequirementDialogProps {
  clarificationId: string;
  title: string;
  description: string;
  context: {
    options: Option[];
    allow_free_text?: boolean;
    free_text_placeholder?: string;
  };
  onSubmit: (
    response: string | { option_id: string; free_text?: string }
  ) => void;
  onCancel: () => void;
}

export const AmbiguousRequirementDialog: React.FC<
  AmbiguousRequirementDialogProps
> = ({ clarificationId, title, description, context, onSubmit, onCancel }) => {
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [freeText, setFreeText] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allowFreeText = context.allow_free_text === true;
  const freeTextPlaceholder =
    context.free_text_placeholder || "请输入您的其他想法...";

  const handleSubmit = () => {
    if (!selectedOption) {
      setError("请选择一个选项");
      return;
    }

    setError("");
    setIsSubmitting(true);

    setTimeout(() => {
      if (allowFreeText && freeText.trim()) {
        onSubmit({
          option_id: selectedOption,
          free_text: freeText.trim(),
        });
      } else {
        onSubmit(selectedOption);
      }
      setIsSubmitting(false);
    }, 300);
  };

  return (
    <div className={styles.clarificationContainer}>
      <div className={styles.clarificationContent}>
        <div className={styles.clarificationHeader}>
          <h3 className={styles.clarificationTitle}>{title}</h3>
          {description && (
            <p className={styles.clarificationDescription}>{description}</p>
          )}
        </div>

        <div className={styles.optionsSection}>
          {context.options.map((option) => (
            <div
              key={option.id}
              className={styles.optionItem}
            >
              <div className={styles.optionHeader}>
                <input
                  type="radio"
                  id={`option-${option.id}`}
                  name="requirement-options"
                  value={option.id}
                  checked={selectedOption === option.id}
                  onChange={(e) => {
                    setSelectedOption(e.target.value);
                    setError("");
                  }}
                  disabled={isSubmitting}
                />
                <label
                  htmlFor={`option-${option.id}`}
                  className={styles.optionLabel}
                >
                  {option.text}
                </label>
              </div>
              {option.explanation && (
                <p className={styles.optionExplanation}>{option.explanation}</p>
              )}
            </div>
          ))}
        </div>

        {allowFreeText && selectedOption && (
          <div className={styles.freeTextSection}>
            <label className={styles.freeTextLabel}>补充说明 (可选)</label>
            <Textarea
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder={freeTextPlaceholder}
              rows={3}
              disabled={isSubmitting}
              className={styles.formInput}
            />
          </div>
        )}

        {error && <div className={styles.errorMessage}>{error}</div>}

        <div className={styles.actionButtons}>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={styles.primaryButton}
          >
            {isSubmitting ? "提交中..." : "提交"}
          </Button>
        </div>
      </div>
    </div>
  );
};

AmbiguousRequirementDialog.displayName = "AmbiguousRequirementDialog";
