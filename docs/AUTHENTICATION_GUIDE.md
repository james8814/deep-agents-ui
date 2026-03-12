# 认证系统开发指南

**最后更新**: 2026-03-12  
**版本**: v5.29  
**架构**: Next.js Middleware + Client-side AuthContext

---

## 📋 概述

本项目使用分层认证架构:

1. **Middleware 层** (服务端, `src/middleware.ts`)
   - 请求级别路由保护
   - 最早的拦截点 (<1ms)
   - 服务端验证

2. **Context 层** (客户端, `src/contexts/AuthContext.tsx`)
   - 用户状态管理
   - Token 生命周期
   - localStorage + Cookie 存储

3. **UI 层** (客户端, `src/components/AuthGuard.tsx`)
   - 加载状态显示
   - 无路由逻辑

---

## 🔐 路由保护规则

### 受保护路由 (需要认证)

这些路由受到 Middleware 保护，未认证用户会被重定向到 `/login`:

```
/ (首页)  ← 需要认证
```

**使用方式**:
```tsx
// src/app/page.tsx
import { AuthGuard } from "@/components/AuthGuard";

export default function HomePage() {
  return (
    <AuthGuard>
      <YourPageContent />
    </AuthGuard>
  );
}
```

### 公开路由 (无需认证)

这些路由对所有用户开放:

```
/login      (登录页)
/register   (注册页)
```

已认证用户访问这些页面会被重定向到 `/`:

```tsx
// src/app/(auth)/login/page.tsx
export default function LoginPage() {
  // 无需 AuthGuard，Middleware 自动处理
  return <LoginForm />;
}
```

### 隐藏路由 (仅开发环境)

这些路由只在开发环境可访问:

```
/antd-x-poc (Ant Design X POC)
```

生产环境访问会显示 404:

```tsx
// src/app/antd-x-poc/page.tsx
import { notFound } from "next/navigation";

export default function PocPage() {
  // 生产环境自动隐藏
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <PocContent />;
}
```

---

## 🛠️ 添加新的受保护页面

### Step 1: 创建页面

```tsx
// src/app/dashboard/page.tsx
export default function DashboardPage() {
  return <DashboardContent />;
}
```

### Step 2: 用 AuthGuard 包装

```tsx
// src/app/dashboard/page.tsx
import { AuthGuard } from "@/components/AuthGuard";

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
```

### Step 3: 更新 Middleware 的受保护路由列表

```typescript
// src/middleware.ts
const PROTECTED_ROUTES = [
  '/',
  '/dashboard',  // ← 新增
];
```

### ✅ 完成!

新页面现在被保护了:
- 未认证用户自动重定向到 `/login`
- 已认证用户可正常访问
- Middleware 提供 <1ms 的性能

---

## 🔑 认证流程

### 登录流程

```
用户 → 填写凭证 → /login 页面
        ↓
    AuthContext.login(username, password)
        ↓
    API: /auth/login-cookie → 获取 JWT token
        ↓
    保存到 localStorage + 设置 Cookie
        ↓
    state: { token, user }
        ↓
    重定向到 / (Middleware 验证通过)
        ↓
    首页加载
```

### 访问受保护资源

```
请求 → Middleware 检查 auth_token cookie
        ↓
    有效 → 继续请求
    无效 → 重定向到 /login
        ↓
    页面加载 → AuthGuard 检查 hasChecked
        ↓
    加载中 → 显示 spinner
    已认证 → 显示内容
```

---

## 📝 常见场景

### 场景 1: 需要在页面中获取用户信息

```tsx
'use client';

import { useAuth } from "@/contexts/AuthContext";

export default function MyPage() {
  const { user, token } = useAuth();

  return (
    <AuthGuard>
      <div>
        <p>欢迎, {user?.username}!</p>
        <p>Token: {token?.substring(0, 10)}...</p>
      </div>
    </AuthGuard>
  );
}
```

### 场景 2: 条件性路由 (根据用户角色)

```tsx
// 未来可以扩展 Middleware 支持 role-based access
// 目前建议在页面级别处理

'use client';

import { useAuth } from "@/contexts/AuthContext";
import { redirect } from "next/navigation";

export default function AdminPage() {
  const { user } = useAuth();

  // 在 AuthGuard 之后检查权限
  if (user?.role !== 'admin') {
    redirect('/');
  }

  return (
    <AuthGuard>
      <AdminContent />
    </AuthGuard>
  );
}
```

### 场景 3: API 调用 (自动添加 Token)

```tsx
'use client';

import { useAuth } from "@/contexts/AuthContext";

export default function MyPage() {
  const { token } = useAuth();

  const fetchData = async () => {
    const response = await fetch('/api/data', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  };

  return (
    <AuthGuard>
      <button onClick={fetchData}>获取数据</button>
    </AuthGuard>
  );
}
```

**注意**: 项目已有 `fetchInterceptor` 自动添加 Bearer token，所以上面的 headers 是可选的。

---

## 🧪 测试认证

### 手工测试

```bash
# 1. 登录
访问 http://localhost:3000
→ 重定向到 /login (因为未认证)

# 2. 填写凭证并登录
输入用户名 + 密码
点击登录
→ 重定向到 / (首页)

# 3. 刷新页面
页面仍然显示 (因为 token 在 localStorage)

# 4. 打开开发者工具
查看 Application → Cookies
→ auth_token cookie 已设置

# 5. 登出
点击登出
→ 重定向到 /login
→ Cookies 中的 auth_token 已清除
```

### 自动化测试 (Playwright E2E)

```typescript
// tests/auth.spec.ts
import { test, expect } from '@playwright/test';

test('complete auth flow', async ({ page }) => {
  // 1. 未认证访问首页 → 重定向到登录
  await page.goto('http://localhost:3000');
  await expect(page).toHaveURL('/login');

  // 2. 登录
  await page.fill('input[type="text"]', 'testuser');
  await page.fill('input[type="password"]', 'password');
  await page.click('button:has-text("登录")');

  // 3. 重定向回首页
  await expect(page).toHaveURL('/');

  // 4. Cookie 已设置
  const cookies = await page.context().cookies();
  const authCookie = cookies.find(c => c.name === 'auth_token');
  expect(authCookie).toBeDefined();

  // 5. 刷新页面 → 仍然认证
  await page.reload();
  await expect(page.locator('text=加载中')).not.toBeVisible({ timeout: 1000 });
});
```

---

## 🔒 安全最佳实践

### ✅ 推荐做法

1. **使用 HTTPS** - Token 通过网络传输时必须加密
2. **HttpOnly Cookies** - 下一步改进：将 token 存储在 HttpOnly cookie 中（防止 XSS）
3. **CORS 配置** - 确保 API 服务器正确配置 CORS
4. **Token 刷新** - 实现 refresh token 机制（目前已有）
5. **Middleware 验证** - 所有路由由 Middleware 保护，无遗漏

### ❌ 避免做法

1. **在 URL 中传递 Token** - 容易被日志记录、浏览历史泄露
2. **在 localStorage 中保存 Token** - 易被 XSS 窃取
   - 当前项目仍使用 localStorage，但在 Middleware 中也验证了 Cookie
   - 下一步改进：仅使用 HttpOnly Cookie
3. **跳过 Middleware 验证** - 必须在服务端验证
4. **在 JSON 中存储 Token** - 必须验证 JWT 签名

---

## 📊 架构演变

### v5.27
```
认证流程: layout.tsx 中全局使用 AuthGuard
问题: SSR 阶段 useEffect 不执行 → hasChecked 永远为 false → 渲染失败 → 404
```

### v5.28 (当前修复)
```
认证流程: 在 page.tsx 中使用 AuthGuard，处理路由重定向
改进: 解决了 SSR 问题
缺陷: 路由保护分散，维护负担增加，易遗漏
```

### v5.29 (推荐)
```
认证流程: Middleware 处理路由，AuthGuard 仅显示加载状态
优点:
- Request 级拦截 (<1ms)
- 无代码入侵 (不需要在每个页面改动)
- 更安全 (服务端验证)
- 更好维护 (集中定义)

当前状态: ✅ 已实现
```

---

## 🚀 未来改进

### v5.30 (计划)

1. **HttpOnly Cookies**
   - 将 token 从 localStorage 迁移到 HttpOnly cookie
   - 防止 XSS 攻击

2. **Role-based Access Control (RBAC)**
   - Middleware 支持 role 检查
   - 不同用户角色不同权限

3. **Token 刷新优化**
   - 后台自动刷新 token
   - 提升用户体验

4. **双因素认证 (2FA)**
   - 增强账户安全

---

## 📞 常见问题

### Q: 为什么要用 Middleware?
**A**: 
- 请求级拦截速度更快 (<1ms vs 100-500ms)
- 服务端验证更安全
- 无需在每个页面重复代码
- 无 hydration 问题

### Q: AuthGuard 现在只显示加载状态?
**A**: 是的。路由级保护由 Middleware 处理，AuthGuard 只负责:
- 显示加载中 spinner
- 无需处理路由逻辑
- 更简单、更可靠

### Q: 我需要在所有页面都加 AuthGuard 吗?
**A**: 不需要。只在需要显示加载状态的页面加。Middleware 会自动保护所有受保护路由。

### Q: Token 存储在哪里?
**A**: 两个地方:
1. **localStorage** - 页面刷新后恢复用户状态
2. **Cookie** - Middleware 验证用户身份

### Q: 如何登出?
**A**: 
```tsx
const { logout } = useAuth();
logout(); // 清除 localStorage + Cookie
```

---

## 📚 相关文件

| 文件 | 说明 |
|------|------|
| `src/middleware.ts` | 路由保护逻辑 |
| `src/contexts/AuthContext.tsx` | 用户状态管理 |
| `src/components/AuthGuard.tsx` | 加载状态 UI |
| `src/lib/fetchInterceptor.ts` | API 请求拦截 |
| `src/api/auth.ts` | 认证 API 调用 |

---

**最后更新**: 2026-03-12  
**维护者**: Frontend Architecture Team  
**反馈**: 提交 Issue 或联系架构师

