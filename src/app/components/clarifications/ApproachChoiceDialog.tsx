"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import styles from "./clarifications.module.css";

interface Approach {
  id: string;
  name: string;
  description?: string;
  pros?: string[];
  cons?: string[];
}

interface ApproachChoiceDialogProps {
  clarificationId: string;
  title: string;
  description: string;
  context: {
    approaches: Approach[];
  };
  onSubmit: (response: string) => void;
  onCancel: () => void;
}

export const ApproachChoiceDialog: React.FC<ApproachChoiceDialogProps> = ({
  clarificationId,
  title,
  description,
  context,
  onSubmit,
  onCancel,
}) => {
  const [selectedId, setSelectedId] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedApproach = context.approaches.find(
    (a) => a.id === selectedId
  );

  const handleSubmit = () => {
    if (!selectedId) return;

    setIsSubmitting(true);
    setTimeout(() => {
      onSubmit(selectedId);
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

        <div className={styles.approachesGrid}>
          {context.approaches.map((approach) => (
            <button
              key={approach.id}
              onClick={() => {
                setSelectedId(approach.id);
                setExpandedId(approach.id);
              }}
              className={`${styles.approachButton} ${
                selectedId === approach.id ? styles.approachButtonSelected : ""
              }`}
              disabled={isSubmitting}
            >
              <div className={styles.approachName}>{approach.name}</div>
              {approach.description && (
                <div className={styles.approachDescription}>
                  {approach.description}
                </div>
              )}

              {(approach.pros?.length || approach.cons?.length) && (
                <div className={styles.approachPreview}>
                  {approach.pros?.slice(0, 1).map((pro, idx) => (
                    <div key={`pro-${idx}`} className={styles.proItem}>
                      ✓ {pro}
                    </div>
                  ))}
                  {approach.cons?.slice(0, 1).map((con, idx) => (
                    <div key={`con-${idx}`} className={styles.conItem}>
                      ✗ {con}
                    </div>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>

        {selectedApproach && (
          <div className={styles.expandedSection}>
            <button
              onClick={() =>
                setExpandedId(expandedId === selectedId ? "" : selectedId)
              }
              className={styles.expandButton}
              disabled={isSubmitting}
            >
              <span>详细对比</span>
              <ChevronDown
                size={16}
                className={`${styles.chevron} ${
                  expandedId === selectedId ? styles.chevronExpanded : ""
                }`}
              />
            </button>

            {expandedId === selectedId && (
              <div className={styles.expandedContent}>
                {selectedApproach.pros && selectedApproach.pros.length > 0 && (
                  <div className={styles.detailSection}>
                    <h4 className={styles.detailTitle}>优势</h4>
                    <ul className={styles.detailList}>
                      {selectedApproach.pros.map((pro, idx) => (
                        <li key={`pro-${idx}`} className={styles.proItem}>
                          ✓ {pro}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedApproach.cons && selectedApproach.cons.length > 0 && (
                  <div className={styles.detailSection}>
                    <h4 className={styles.detailTitle}>劣势</h4>
                    <ul className={styles.detailList}>
                      {selectedApproach.cons.map((con, idx) => (
                        <li key={`con-${idx}`} className={styles.conItem}>
                          ✗ {con}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
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
          <Button
            onClick={handleSubmit}
            disabled={!selectedId || isSubmitting}
            className={styles.primaryButton}
          >
            {isSubmitting ? "提交中..." : "确认方案"}
          </Button>
        </div>
      </div>
    </div>
  );
};

ApproachChoiceDialog.displayName = "ApproachChoiceDialog";
