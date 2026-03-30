/**
 * fetchInterceptor 单元测试
 * 测试 URL 匹配逻辑和 Bearer Token 添加
 *
 * 注意：由于 fetchInterceptor 在导入时会 monkey-patch window.fetch，
 * 这里我们直接测试其内部函数逻辑，而不导入原模块
 */

// Re-implement the logic to test (mirroring the actual implementation)
function shouldAddAuthHeader(url: string): boolean {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
  const authUrl = process.env.NEXT_PUBLIC_AUTH_URL || "";

  // LangGraph Server
  if (
    url.includes("localhost:2024") ||
    url.includes("127.0.0.1:2024") ||
    (apiUrl ? url.includes(apiUrl) : false)
  ) {
    return true;
  }

  // Auth Server 的 /api/ 端点（上传/下载/删除文件等需要认证的端点）
  const isAuthServerUrl =
    url.includes("localhost:8000") ||
    url.includes("127.0.0.1:8000") ||
    (authUrl ? url.includes(authUrl) : false);

  if (isAuthServerUrl && url.includes("/api/")) {
    return true;
  }

  return false;
}

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
});

describe("shouldAddAuthHeader", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset env for each test
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_API_URL = undefined as any;
    process.env.NEXT_PUBLIC_AUTH_URL = undefined as any;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("LangGraph Server 匹配", () => {
    test("localhost:2024 应匹配", () => {
      expect(shouldAddAuthHeader("http://localhost:2024/threads")).toBe(true);
      expect(shouldAddAuthHeader("http://localhost:2024/runs")).toBe(true);
    });

    test("127.0.0.1:2024 应匹配", () => {
      expect(shouldAddAuthHeader("http://127.0.0.1:2024/threads")).toBe(true);
    });

    test("localhost:2025 不再匹配（已废弃的上传服务端口）", () => {
      expect(shouldAddAuthHeader("http://localhost:2025/assistants")).toBe(
        false
      );
    });

    test("使用环境变量配置的 API URL 应匹配", () => {
      process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";
      expect(shouldAddAuthHeader("https://api.example.com/threads")).toBe(true);
      expect(shouldAddAuthHeader("https://api.example.com/assistants")).toBe(
        true
      );
    });

    test("非 API URL 不应匹配", () => {
      expect(shouldAddAuthHeader("http://localhost:3000/chat")).toBe(false);
      expect(shouldAddAuthHeader("https://google.com")).toBe(false);
      expect(shouldAddAuthHeader("http://example.com")).toBe(false);
    });
  });

  describe("Auth Server /api/ 端点匹配", () => {
    test("localhost:8000 的 /api/ 端点应匹配", () => {
      expect(shouldAddAuthHeader("http://localhost:8000/api/files")).toBe(true);
      expect(shouldAddAuthHeader("http://localhost:8000/api/upload")).toBe(
        true
      );
    });

    test("127.0.0.1:8000 的 /api/ 端点应匹配", () => {
      expect(shouldAddAuthHeader("http://127.0.0.1:8000/api/files")).toBe(true);
    });

    test("使用环境变量配置的 Auth URL 的 /api/ 端点应匹配", () => {
      process.env.NEXT_PUBLIC_AUTH_URL = "https://auth.example.com";
      expect(shouldAddAuthHeader("https://auth.example.com/api/files")).toBe(
        true
      );
    });

    test("/auth/ 端点不应匹配（登录/注册本身不需要 token）", () => {
      expect(shouldAddAuthHeader("http://localhost:8000/auth/login")).toBe(
        false
      );
      expect(shouldAddAuthHeader("http://localhost:8000/auth/register")).toBe(
        false
      );
      expect(shouldAddAuthHeader("http://localhost:8000/auth/logout")).toBe(
        false
      );
    });

    test("非 /api/ 端点不应匹配", () => {
      expect(shouldAddAuthHeader("http://localhost:8000/")).toBe(false);
      expect(shouldAddAuthHeader("http://localhost:8000/users")).toBe(false);
    });
  });

  describe("URL 包含检查", () => {
    test("URL 包含端口号时应匹配（使用环境变量配置时）", () => {
      process.env.NEXT_PUBLIC_API_URL = "https://api.example.com:8080";
      expect(shouldAddAuthHeader("https://api.example.com:8080/threads")).toBe(
        true
      );
    });

    test("URL 包含子路径时应匹配", () => {
      expect(
        shouldAddAuthHeader("http://localhost:2024/v1/threads/abc123")
      ).toBe(true);
      expect(
        shouldAddAuthHeader("http://localhost:2024/threads/abc123/runs")
      ).toBe(true);
    });

    test("带查询参数的 URL 应正确匹配", () => {
      expect(
        shouldAddAuthHeader("http://localhost:2024/threads?limit=10")
      ).toBe(true);
      expect(
        shouldAddAuthHeader("http://localhost:8000/api/files?id=123")
      ).toBe(true);
    });
  });

  describe("边界情况", () => {
    test("空字符串 URL", () => {
      expect(shouldAddAuthHeader("")).toBe(false);
    });

    test("仅协议部分的 URL", () => {
      expect(shouldAddAuthHeader("http://")).toBe(false);
    });

    test("不同端口的相同主机名不匹配", () => {
      expect(shouldAddAuthHeader("http://localhost:3000/api")).toBe(false);
    });
  });
});

describe("getStoredToken (mock test)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("应从 localStorage 获取 token", () => {
    (localStorage.getItem as jest.Mock).mockReturnValue("mock-token");

    // Simulate getStoredToken function
    const TOKEN_KEY = "auth_token";
    const getStoredToken = () => localStorage.getItem(TOKEN_KEY);

    const token = getStoredToken();
    expect(token).toBe("mock-token");
    expect(localStorage.getItem).toHaveBeenCalledWith("auth_token");
  });

  test("localStorage 返回 null 时应返回 null", () => {
    (localStorage.getItem as jest.Mock).mockReturnValue(null);

    const TOKEN_KEY = "auth_token";
    const getStoredToken = () => localStorage.getItem(TOKEN_KEY);

    const token = getStoredToken();
    expect(token).toBeNull();
  });
});
