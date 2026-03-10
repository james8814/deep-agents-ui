/**
 * Unit Tests for Config Utilities
 */

import { getConfig, saveConfig, clearConfig, isConfigValid } from "../config";

describe("Config Utilities", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("getConfig", () => {
    it("should return default config when not set", () => {
      const config = getConfig();
      expect(config).toBeDefined();
    });

    it("should retrieve saved config from localStorage", () => {
      const testConfig = {
        deploymentUrl: "http://localhost:2024",
        assistantId: "test-assistant",
      };

      localStorage.setItem("deep-agent-config-v2", JSON.stringify(testConfig));

      const config = getConfig();
      expect(config.deploymentUrl).toBe(testConfig.deploymentUrl);
      expect(config.assistantId).toBe(testConfig.assistantId);
    });

    it("should handle invalid JSON gracefully", () => {
      localStorage.setItem("deep-agent-config-v2", "invalid-json");
      const config = getConfig();
      expect(config).toBeDefined();
    });
  });

  describe("saveConfig", () => {
    it("should save config to localStorage", () => {
      const testConfig = {
        deploymentUrl: "http://localhost:2024",
        assistantId: "test-assistant",
      };

      saveConfig(testConfig);

      const saved = localStorage.getItem("deep-agent-config-v2");
      expect(saved).toBeDefined();
      expect(JSON.parse(saved!)).toEqual(testConfig);
    });

    it("should update existing config", () => {
      const config1 = { deploymentUrl: "url1", assistantId: "id1" };
      const config2 = { deploymentUrl: "url2", assistantId: "id2" };

      saveConfig(config1);
      saveConfig(config2);

      const saved = getConfig();
      expect(saved.deploymentUrl).toBe("url2");
      expect(saved.assistantId).toBe("id2");
    });
  });

  describe("clearConfig", () => {
    it("should remove config from localStorage", () => {
      const testConfig = {
        deploymentUrl: "http://localhost:2024",
        assistantId: "test-assistant",
      };

      saveConfig(testConfig);
      clearConfig();

      const saved = localStorage.getItem("deep-agent-config-v2");
      expect(saved).toBeNull();
    });
  });

  describe("isConfigValid", () => {
    it("should validate correct config", () => {
      const config = {
        deploymentUrl: "http://localhost:2024",
        assistantId: "test-assistant",
      };

      expect(isConfigValid(config)).toBe(true);
    });

    it("should reject config with missing deploymentUrl", () => {
      const config = {
        assistantId: "test-assistant",
      };

      expect(isConfigValid(config as any)).toBe(false);
    });

    it("should reject config with missing assistantId", () => {
      const config = {
        deploymentUrl: "http://localhost:2024",
      };

      expect(isConfigValid(config as any)).toBe(false);
    });

    it("should reject empty config", () => {
      expect(isConfigValid({} as any)).toBe(false);
    });

    it("should reject invalid URL", () => {
      const config = {
        deploymentUrl: "not-a-url",
        assistantId: "test",
      };

      expect(isConfigValid(config)).toBe(false);
    });
  });
});
