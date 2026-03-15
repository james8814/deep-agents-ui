# Azune Logo 融入方案评审报告

**评审日期**: 2026-03-15
**评审团队**: 前端架构师 + 产品主管
**评审对象**: Azune Logo 融入 UI 设计方案

---

## 一、评审结论

**结论**: ⚠️ **有条件通过** - 需要补充设计规范后实施

| 评估维度 | 评分 | 状态 |
|----------|------|------|
| 资源完整性 | 90/100 | ✅ 通过 |
| 设计一致性 | 60/100 | ⚠️ 需调整 |
| 技术可行性 | 95/100 | ✅ 通过 |
| 工作量评估 | 80/100 | ✅ 可控 |
| **综合评分** | **81/100** | **有条件通过** |

---

## 二、资源完整性验证

### 2.1 现有 Logo 资产清单

| 文件名 | 尺寸 | 用途 | 状态 |
|--------|------|------|------|
| `azune_favicon_16.svg` | 16x16 | 浏览器标签 | ✅ 可用 |
| `azune_favicon_32.svg` | 32x32 | 高分屏标签 | ✅ 可用 |
| `azune_icon_dark.svg` | 200x200 | 透明/深色背景 | ✅ 可用 |
| `azune_icon_light_bg.svg` | 200x200 | 浅色背景 | ✅ 可用 |
| `azune_icon_white.svg` | 200x200 | 单色白色 | ✅ 可用 |

**资源完整性**: ✅ **5/5 资产齐全**

### 2.2 Logo 设计规范提取

```svg
设计参数:
├── A 字母
│   ├── 高度: 110px (y=-55 to y=55)
│   ├── 宽度: 68px (x=-34 to x=34)
│   ├── 描边: 5.5px
│   └── 颜色: #1A1A2A (dark) / #FFFFFF (light)
├── 精准圆环
│   ├── 半径: r=8
│   ├── 描边: 2px
│   └── 颜色: #6D28D9 (violet) / 继承
└── 靶心
    ├── 半径: r=2.2
    └── 颜色: #6D28D9 (violet) / 继承
```

---

## 三、设计一致性分析 ⚠️ 关键问题

### 3.1 颜色系统对比

| 变量 | v5.26 设计原稿 | 当前实现 | Logo 资产 | 匹配度 |
|------|----------------|----------|-----------|--------|
| `--brand` (紫色) | `#7C6BF0` | `#7C6BF0` | `#6D28D9` | ❌ **不匹配** |
| `--cyan` (青色) | `#38BDF8` | ❌ 未定义 | - | ❌ **缺失** |
| Logo 渐变 | `cyan → brand → brand-d` | - | - | ❌ **无法实现** |

**问题**: Logo 资产使用的紫色 `#6D28D9` 与设计系统的 `--brand: #7C6BF0` 不一致。

### 3.2 v5.26 Logo 渐变规范

```css
/* v5.26 设计原稿 */
background: linear-gradient(135deg, var(--cyan), var(--brand), var(--brand-d));
```

当前 CSS 缺失:
- ❌ `--cyan: #38BDF8` 未定义
- ❌ `--brand-d: #5B4BC7` 未定义 (dark mode)

### 3.3 Logo 使用位置对比

| 位置 | v5.26 设计原稿 | 当前实现 | 差异 |
|------|----------------|----------|------|
| **Sidebar** | 36x36px + 渐变背景 + "A" 文字 | 渐变背景 + Menu/X 图标 | ❌ 完全不同 |
| **WelcomeScreen** | 72x72px + 渐变 + 浮动动画 | 64x64px + Sparkles 图标 | ❌ 完全不同 |
| **Favicon** | SVG favicon | Next.js 默认 | ❌ 未替换 |
| **通知图标** | `/logo.svg` | `/logo.svg` (不存在) | ❌ 缺失 |

---

## 四、技术可行性评估

### 4.1 方案对比

| 方案 | 描述 | 优点 | 缺点 | 推荐度 |
|------|------|------|------|--------|
| **A: 直接替换** | 复制 SVG 到 public/，直接引用 | 简单快速 | 颜色固定，不响应主题 | ⭐⭐⭐ |
| **B: React 组件** | 封装为 `<AzuneLogo />` 组件 | 可定制、可响应主题 | 需要重构多处引用 | ⭐⭐⭐⭐⭐ |
| **C: CSS 变量** | 使用 `currentColor` 和 CSS 变量 | 主题自适应 | 需要修改 SVG 源文件 | ⭐⭐⭐⭐ |

### 4.2 推荐方案: B + C 组合

```tsx
// src/components/AzuneLogo.tsx
interface AzuneLogoProps {
  size?: number;           // 36 | 64 | 72 | 80
  variant?: 'auto' | 'dark' | 'light';
  animated?: boolean;
  showText?: boolean;
}
```

**实现策略**:
1. 创建可复用的 `AzuneLogo` 组件
2. 使用 `currentColor` 实现主题自适应
3. 支持 4 种尺寸: 36px (sidebar) / 64px (notification) / 72px (welcome) / 80px (login)
4. 渐变背景使用 CSS 变量实现

---

## 五、工作量评估

| 任务 | 预估工时 | 优先级 | 依赖 |
|------|----------|--------|------|
| 1. 复制 Logo 资产到 public/ | 0.1 day | P0 | 无 |
| 2. 添加缺失的 CSS 变量 (--cyan, --brand-d) | 0.1 day | P0 | 无 |
| 3. 创建 AzuneLogo 组件 | 0.5 day | P0 | 任务 2 |
| 4. 更新 Sidebar.tsx | 0.2 day | P0 | 任务 3 |
| 5. 更新 WelcomeScreen.tsx | 0.2 day | P0 | 任务 3 |
| 6. 更新 favicon 和 metadata | 0.1 day | P1 | 任务 1 |
| 7. 更新通知图标 | 0.1 day | P2 | 任务 1 |
| **总计** | **1.3 day** | - | - |

---

## 六、风险与阻塞项

### 6.1 阻塞项 (必须解决)

| # | 阻塞项 | 影响 | 解决方案 |
|---|--------|------|----------|
| 1 | `--cyan` CSS 变量缺失 | Logo 渐变无法实现 | 添加 `--cyan: 199 89% 48%` (#38BDF8) |
| 2 | `--brand-d` CSS 变量缺失 | Logo 渐变深色端缺失 | 添加 `--brand-d: #5B4BC7` |

### 6.2 风险项 (需注意)

| # | 风险 | 概率 | 缓解措施 |
|---|------|------|----------|
| 1 | Logo 紫色与品牌色不一致 | 高 | 使用 CSS 变量统一 |
| 2 | 主题切换时 Logo 颜色不跟随 | 中 | 使用 `currentColor` |
| 3 | 多尺寸下 Logo 细节丢失 | 低 | 提供 favicon 专用简化版 |

---

## 七、实施建议

### 7.1 立即行动 (Phase 0)

```css
/* 添加到 globals.css :root */
--cyan: 199 89% 48%;           /* #38BDF8 */
--cyan-d: 188 94% 43%;         /* #0EA5E9 */
--brand-d: 263 70% 55%;        /* #5B4BC7 */
```

### 7.2 组件实现 (Phase 1)

```tsx
// 优先使用 AzuneLogo 组件替代硬编码图标
// Sidebar.tsx
<AzuneLogo size={36} variant="auto" showText={expanded} />

// WelcomeScreen.tsx
<AzuneLogo size={72} variant="auto" animated />
```

### 7.3 资产迁移 (Phase 0)

```bash
cp docs/brand/azune_favicon_32.svg deep-agents-ui/public/favicon.svg
cp docs/brand/azune_icon_dark.svg deep-agents-ui/public/logo.svg
```

---

## 八、最终评审意见

### 前端架构师意见

> Logo 资产完整，技术实现方案可行。但存在 **设计系统不一致** 的阻塞问题：
> 1. `--cyan` 变量缺失导致无法实现 v5.26 设计原稿的渐变效果
> 2. Logo SVG 使用的紫色 `#6D28D9` 与设计系统 `--brand: #7C6BF0` 存在差异
>
> **建议**: 先补充缺失的 CSS 变量，再实施 Logo 融入。

### 产品主管意见

> Logo 融入是品牌一致性的重要一环。当前实现与设计原稿偏差较大：
> - Sidebar 使用 Menu/X 图标而非 Azune Logo
> - WelcomeScreen 使用 Sparkles 图标而非品牌 Logo
> - 通知图标指向不存在的 `/logo.svg`
>
> **建议**: 按 Phase 0 → Phase 1 顺序实施，预计 1.3 天完成。

---

## 九、评审决议

| 项目 | 决议 |
|------|------|
| **评审结果** | ⚠️ **有条件通过** |
| **前置条件** | 补充 `--cyan` / `--brand-d` CSS 变量 |
| **推荐方案** | 方案 B+C: React 组件 + CSS 变量 |
| **预计工时** | 1.3 天 |
| **优先级** | P0 (阻塞 UI 品牌一致性) |
| **批准实施** | 待用户确认 |

---

**评审签章**: 前端架构师 + 产品主管
**日期**: 2026-03-15
