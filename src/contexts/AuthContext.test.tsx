/**
 * AuthContext 单元测试
 * 测试 isTokenExpired() 函数的各种边界情况以及登录/登出流程
 */

import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth, isTokenExpired } from "@/contexts/AuthContext";
import * as authApi from "@/api/auth";
import { HttpError } from "@/api/client";

// Mock dependencies
jest.mock("@/api/auth");
jest.mock("@/api/client");

const mockAuthApi = authApi as jest.Mocked<typeof authApi>;

describe("isTokenExpired", () => {
  // Helper function to generate JWT token
  const createMockToken = (payload: Record<string, unknown>): string => {
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payloadStr = btoa(JSON.stringify(payload));
    const signature = btoa("mock-signature");
    return `${header}.${payloadStr}.${signature}`;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test("应返回 true，当 token 为空字符串", () => {
    expect(isTokenExpired("")).toBe(true);
  });

  test("应返回 true，当 token 格式不正确（不是3部分）", () => {
    expect(isTokenExpired("not-a-valid-token")).toBe(true);
    expect(isTokenExpired("part1.part2")).toBe(true);
    expect(isTokenExpired("a.b.c.d")).toBe(true);
  });

  test("应返回 true，当 payload 解析失败", () => {
    // Invalid base64 in payload
    const token =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.!!!invalid!!!.mock-signature";
    expect(isTokenExpired(token)).toBe(true);
  });

  test("应返回 false，当 token 没有 exp 字段（交给服务端验证）", () => {
    const payload = { userId: "123", username: "test" };
    const token = createMockToken(payload);
    expect(isTokenExpired(token)).toBe(false);
  });

  test("应返回 true，当 token 已过期", () => {
    // Token expired 1 hour ago
    const expiredTime = Math.floor(Date.now() / 1000) - 3600;
    const payload = { exp: expiredTime };
    const token = createMockToken(payload);
    expect(isTokenExpired(token)).toBe(true);
  });

  test("应返回 true，当 token 即将在30秒内过期（缓冲时间）", () => {
    // Token expires in 20 seconds (within 30s buffer)
    const soonExpireTime = Math.floor(Date.now() / 1000) + 20;
    const payload = { exp: soonExpireTime };
    const token = createMockToken(payload);
    expect(isTokenExpired(token)).toBe(true);
  });

  test("应返回 false，当 token 未过期且有充足时间", () => {
    // Token expires in 1 hour
    const validTime = Math.floor(Date.now() / 1000) + 3600;
    const payload = { exp: validTime };
    const token = createMockToken(payload);
    expect(isTokenExpired(token)).toBe(false);
  });

  test("应返回 false，当 token 刚好超过30秒缓冲时间", () => {
    // Token expires in exactly 31 seconds (outside 30s buffer)
    const validTime = Math.floor(Date.now() / 1000) + 31;
    const payload = { exp: validTime };
    const token = createMockToken(payload);
    expect(isTokenExpired(token)).toBe(false);
  });

  test("应正确处理 URL-safe base64 字符（- 和 _）", () => {
    // This is tested implicitly through the URL-safe base64 replacement in the function
    // Test with a token that has URL-safe base64 in payload
    const header = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
    // Payload with URL-safe base64 (contains - and _)
    const payload = btoa(
      JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })
    )
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    const signature = "mock-signature";
    const token = `${header}.${payload}.${signature}`;
    expect(isTokenExpired(token)).toBe(false);
  });
});

describe("AuthProvider", () => {
  const mockUser = {
    id: "user-1",
    username: "testuser",
    email: "test@example.com",
    is_active: true,
  };

  const mockLoginResponse = {
    access_token: "mock-access-token",
    token_type: "Bearer",
    expires_in: 1800,
    user_id: "user-1",
    username: "testuser",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    (localStorage.getItem as jest.Mock).mockReturnValue(null);
  });

  const renderWithAuth = () => {
    return render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
  };

  test("初始状态应为 loading", () => {
    mockAuthApi.getUserInfo.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithAuth();

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test("没有 token 时应设置为未认证状态", async () => {
    (localStorage.getItem as jest.Mock).mockReturnValue(null);
    mockAuthApi.getUserInfo.mockResolvedValue(mockUser);

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByText(/未认证/i)).toBeInTheDocument();
    });
  });

  test("Token 已过期时应清除 token 并设置为未认证", async () => {
    const expiredToken = createMockToken({
      exp: Math.floor(Date.now() / 1000) - 3600,
    });
    (localStorage.getItem as jest.Mock).mockReturnValue(expiredToken);
    mockAuthApi.getUserInfo.mockResolvedValue(mockUser);

    renderWithAuth();

    await waitFor(() => {
      expect(localStorage.removeItem).toHaveBeenCalled();
      expect(screen.getByText(/未认证/i)).toBeInTheDocument();
    });
  });

  test("Token 有效时应验证并获取用户信息", async () => {
    const validToken = createMockToken({
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    (localStorage.getItem as jest.Mock).mockReturnValue(validToken);
    mockAuthApi.getUserInfo.mockResolvedValue(mockUser);

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByText(/testuser/i)).toBeInTheDocument();
    });
  });

  test("登录成功时应存储 token 并设置用户", async () => {
    mockAuthApi.login.mockResolvedValue(mockLoginResponse);
    mockAuthApi.getUserInfo.mockResolvedValue(mockUser);

    const { result } = renderHookWithAuth();

    await act(async () => {
      await result.current.login("testuser", "password123");
    });

    expect(localStorage.setItem).toHaveBeenCalledWith(
      "auth_token",
      mockLoginResponse.access_token
    );
    expect(mockAuthApi.getUserInfo).toHaveBeenCalledWith(
      mockLoginResponse.access_token
    );
  });

  test("登出时应清除 token 和用户状态", async () => {
    const validToken = createMockToken({
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    (localStorage.getItem as jest.Mock).mockReturnValue(validToken);
    mockAuthApi.getUserInfo.mockResolvedValue(mockUser);
    mockAuthApi.logout.mockResolvedValue(undefined);

    const { result } = renderHookWithAuth();

    // Wait for initial auth check
    await waitFor(() => {
      expect(result.current.hasChecked).toBe(true);
    });

    // Perform logout
    await act(async () => {
      await result.current.logout();
    });

    expect(localStorage.removeItem).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
  });

  test("获取用户信息失败（401/403）时应清除 token", async () => {
    const validToken = createMockToken({
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    (localStorage.getItem as jest.Mock).mockReturnValue(validToken);
    mockAuthApi.getUserInfo.mockRejectedValue(
      new HttpError("Unauthorized", 401)
    );

    renderWithAuth();

    await waitFor(() => {
      expect(localStorage.removeItem).toHaveBeenCalled();
      expect(screen.getByText(/未认证/i)).toBeInTheDocument();
    });
  });

  test("网络错误时应保留 token 但标记为未认证", async () => {
    const validToken = createMockToken({
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    (localStorage.getItem as jest.Mock).mockReturnValue(validToken);
    mockAuthApi.getUserInfo.mockRejectedValue(new Error("Network error"));

    renderWithAuth();

    await waitFor(() => {
      // Token should NOT be removed for network errors
      expect(localStorage.removeItem).not.toHaveBeenCalled();
      // But user should be null (not authenticated)
      expect(screen.getByText(/未认证/i)).toBeInTheDocument();
    });
  });
});

// Helper function to create mock token
function createMockToken(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payloadStr = btoa(JSON.stringify(payload));
  const signature = btoa("mock-signature");
  return `${header}.${payloadStr}.${signature}`;
}

// Helper component to access AuthContext
function TestComponent() {
  const { user, token, isAuthenticated, isLoading, hasChecked, login, logout } =
    useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div data-testid="user">{user ? user.username : "未认证"}</div>
      <div data-testid="token">{token ? "有 token" : "无 token"}</div>
      <div data-testid="authenticated">
        {isAuthenticated ? "已认证" : "未认证"}
      </div>
      <div data-testid="checked">{hasChecked ? "已检查" : "未检查"}</div>
      <button onClick={() => login("test", "password")}>登录</button>
      <button onClick={() => logout()}>登出</button>
    </div>
  );
}

// Helper to render hook with context
function renderHookWithAuth() {
  let result: any;
  function HookWrapper({
    children,
  }: {
    children: (result: any) => React.ReactNode;
  }) {
    result = useAuth();
    return <>{children(result)}</>;
  }

  const { rerender } = render(
    <AuthProvider>
      <HookWrapper>
        {(res) => {
          return <div>{res.user?.username || "未认证"}</div>;
        }}
      </HookWrapper>
    </AuthProvider>
  );

  return { result, rerender };
}
