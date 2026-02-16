"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface InterruptActionsProps {
  onApprove: (value: unknown) => void;
  onReject: () => void;
  approvalOptions?: { label: string; value: unknown }[];
}

export const InterruptActions = React.memo<InterruptActionsProps>(
  ({ onApprove, onReject, approvalOptions }) => {
    const options = approvalOptions || [
      { label: "Approve", value: true },
      { label: "Reject", value: false },
    ];

    return (
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={() => onApprove(true)} className="gap-1">
          <Check size={14} />
          Approve
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={onReject}
          className="gap-1"
        >
          <X size={14} />
          Reject
        </Button>
      </div>
    );
  }
);

InterruptActions.displayName = "InterruptActions";
