"use client";

import React, { useState, useEffect } from "react";
import { useThemeSettings } from "@/providers/ThemeProvider";

interface AntdProviderProps {
  children: React.ReactNode;
}

/**
 * AntdProvider — 条件加载 Ant Design X
 *
 * 仅当 useAntdX=true 时才加载 XProvider + antd theme，
 * 否则直接透传 children，避免 antd 全局样式污染。
 */
export function AntdProvider({ children }: AntdProviderProps) {
  const { settings } = useThemeSettings();
  const [useAntdX, setUseAntdX] = useState(false);

  // 从 localStorage 读取 useAntdX 配置
  useEffect(() => {
    try {
      const stored = localStorage.getItem("deep-agent-config-v2");
      if (stored) {
        const config = JSON.parse(stored);
        setUseAntdX(!!config.useAntdX);
      }
    } catch {
      // ignore
    }

    // 监听配置变化
    const handler = () => {
      try {
        const stored = localStorage.getItem("deep-agent-config-v2");
        if (stored) {
          const config = JSON.parse(stored);
          setUseAntdX(!!config.useAntdX);
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener("deep-agent-config-change", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("deep-agent-config-change", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  // useAntdX=false（默认）: 直接透传，不加载任何 antd 依赖
  if (!useAntdX) {
    return <>{children}</>;
  }

  // useAntdX=true: 动态加载 XProvider
  return (
    <AntdXProviderInner isDark={settings.theme === "dark"}>
      {children}
    </AntdXProviderInner>
  );
}

/**
 * 内部组件 — 仅在 useAntdX=true 时挂载，实现 antd 的真正懒加载
 */
function AntdXProviderInner({
  children,
  isDark,
}: {
  children: React.ReactNode;
  isDark: boolean;
}) {
  // 动态导入 antd — 只有这个组件渲染时才加载
  const [XProvider, setXProvider] = useState<React.ComponentType<any> | null>(
    null
  );
  const [themeModule, setThemeModule] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      import("@ant-design/x").then((m) => m.XProvider),
      import("antd").then((m) => m.theme),
    ]).then(([xp, th]) => {
      if (!cancelled) {
        setXProvider(() => xp);
        setThemeModule(th);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 未加载完成前直接透传
  if (!XProvider || !themeModule) {
    return <>{children}</>;
  }

  return (
    <XProvider
      theme={{
        algorithm: isDark ? themeModule.darkAlgorithm : themeModule.defaultAlgorithm,
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
