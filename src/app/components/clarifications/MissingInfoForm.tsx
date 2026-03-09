"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { AlertCircle } from "lucide-react";
import styles from "./clarifications.module.css";

interface MissingInfoFormProps {
  clarificationId: string;
  title: string;
  description: string;
  context: {
    placeholder?: string;
    input_type?: "text" | "number" | "date" | "email" | "textarea";
    hint?: string;
    required?: boolean;
  };
  onSubmit: (response: string) => void;
  onCancel: () => void;
}

export const MissingInfoForm: React.FC<MissingInfoFormProps> = ({
  clarificationId,
  title,
  description,
  context,
  onSubmit,
  onCancel,
}) => {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputType = context.input_type || "textarea";
  const placeholder = context.placeholder || "请输入您的答案...";
  const isRequired = context.required !== false;

  const handleSubmit = () => {
    const trimmedValue = value.trim();

    // Validation
    if (isRequired && !trimmedValue) {
      setError("此字段为必填项");
      return;
    }

    if (trimmedValue.length < 3) {
      setError("请至少输入3个字符");
      return;
    }

    setError("");
    setIsSubmitting(true);

    // Simulate async submission (can be replaced with actual API call)
    setTimeout(() => {
      onSubmit(trimmedValue);
      setIsSubmitting(false);
    }, 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      handleSubmit();
    }
  };

  return (
    <div className={styles.clarificationContainer}>
      <div className={styles.clarificationContent}>
        {/* Header */}
        <div className={styles.clarificationHeader}>
          <h3 className={styles.clarificationTitle}>{title}</h3>
          {description && (
            <p className={styles.clarificationDescription}>{description}</p>
          )}
        </div>

        {/* Input Section */}
        <div className={styles.inputSection}>
          {inputType === "textarea" ? (
            <Textarea
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError("");
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={5}
              disabled={isSubmitting}
              className={`${styles.formInput} ${error ? styles.inputError : ""}`}
            />
          ) : (
            <Input
              type={inputType}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError("");
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isSubmitting}
              className={`${styles.formInput} ${error ? styles.inputError : ""}`}
            />
          )}

          {/* Hint Text */}
          {context.hint && (
            <p className={styles.hintText}>{context.hint}</p>
          )}

          {/* Error Message */}
          {error && (
            <div className={styles.errorMessage}>
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {/* Character Count */}
          <div className={styles.characterCount}>
            {value.length} 字符
          </div>
        </div>

        {/* Action Buttons */}
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

MissingInfoForm.displayName = "MissingInfoForm";
