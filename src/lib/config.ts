/**
 * 配置管理
 * 注意：认证已从 API Key 改为 Cookie 模式
 */

export interface StandaloneConfig {
  deploymentUrl: string;
  assistantId: string;
  // 移除 langsmithApiKey，改用 Cookie 认证
  useAntdX?: boolean;
}

const CONFIG_KEY = "deep-agent-config-v2"; // 新版本 key，避免冲突

export function getConfig(): StandaloneConfig | null {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem(CONFIG_KEY);
  if (!stored) return null;

  try {
    const config = JSON.parse(stored);

    // 迁移：移除旧版本的 apiKey（_ 前缀表示故意未使用）
    if ("langsmithApiKey" in config) {
      const { langsmithApiKey: __langsmithApiKey, ...rest } = config;
      saveConfig(rest);
      return rest;
    }

    return config;
  } catch {
    return null;
  }
}

export function saveConfig(config: StandaloneConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  // Dispatch custom event to notify same-tab listeners
  window.dispatchEvent(
    new CustomEvent("deep-agent-config-change", { detail: config })
  );
}

export function getDefaultConfig(): StandaloneConfig {
  return {
    deploymentUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:2024",
    assistantId: "pmagent",
    useAntdX: false, // 🔧 修复：默认使用原生 InputArea，避免双 Send 按钮
  };
}

// 清理旧版本配置
export function clearOldConfig(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("deep-agent-config");
}
