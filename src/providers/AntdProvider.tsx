"use client";

import React from "react";
import { XProvider } from "@ant-design/x";
import { theme } from "antd";
import { useThemeSettings } from "@/providers/ThemeProvider";

interface AntdProviderProps {
  children: React.ReactNode;
}

export function AntdProvider({ children }: AntdProviderProps) {
  const { settings } = useThemeSettings();
  const isDark = settings.theme === "dark";

  return (
    <XProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: "#076699",
          colorPrimaryHover: "#087ab8",
          colorPrimaryActive: "#065a8a",
        },
      }}
    >
      {children}
    </XProvider>
  );
}
