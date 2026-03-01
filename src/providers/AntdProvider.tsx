"use client";

import React, { useEffect, useState } from "react";
import { XProvider } from "@ant-design/x";
import { theme } from "antd";

interface AntdProviderProps {
  children: React.ReactNode;
}

export function AntdProvider({ children }: AntdProviderProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // 检测系统主题
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mediaQuery.matches);

    // 监听主题变化
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mediaQuery.addEventListener("change", handler);

    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

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
