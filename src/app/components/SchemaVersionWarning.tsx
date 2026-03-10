"use client";

import React from "react";
import { AlertCircle } from "lucide-react";
import { isSchemaVersionCompatible } from "@/app/types/types";

interface SchemaVersionWarningProps {
  schemaVersion?: string;
  minSupportedVersion?: string;
}

/**
 * Displays a warning when message schema version is incompatible with the current frontend.
 * Phase 2.5 P2-2: Schema Versioning support
 */
export const SchemaVersionWarning = React.memo<SchemaVersionWarningProps>(
  ({ schemaVersion, minSupportedVersion = "2.0" }) => {
    if (
      !schemaVersion ||
      isSchemaVersionCompatible(schemaVersion, minSupportedVersion)
    ) {
      return null;
    }

    return (
      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        <AlertCircle
          size={16}
          className="mt-0.5 flex-shrink-0"
        />
        <div>
          <p className="font-semibold">Schema Version Incompatible</p>
          <p className="text-xs">
            Message uses schema v{schemaVersion}, but frontend supports v
            {minSupportedVersion} or later. Some features may not display
            correctly.
          </p>
        </div>
      </div>
    );
  }
);

SchemaVersionWarning.displayName = "SchemaVersionWarning";
