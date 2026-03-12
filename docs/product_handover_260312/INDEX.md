# 产品交接文档索引

> 生成时间: 2026-03-12
> 代码库: deep-agents-ui (Next.js AI 聊天界面)
> 技术栈: Next.js 16 + React 19 + TypeScript + Tailwind CSS + LangGraph SDK + shadcn/ui

## 阅读路线

**Day 1（建立全貌）**: D1 产品概览 → D2 功能清单
**Day 2-3（理解业务）**: D6 术语表 → D3 业务流程 → D4 用户旅程
**Day 4-5（深入细节）**: D5 数据模型 → D7 项目历史
**Week 2（进入工作状态）**: D8 风险评估 → D9 决策记录
**持续参考**: D10 架构清单 / D11 依赖清单 / A1 埋点现状

## 文档清单

| 编号 | 文档 | 文件名 | 状态 |
|------|------|--------|------|
| D1 | 产品概览与定位 | D1_产品概览与定位.md | ✅ |
| D2 | 功能清单与完成度矩阵 | D2_功能清单与完成度矩阵.md | ✅ |
| D3 | 核心业务流程与状态机 | D3_核心业务流程与状态机.md | ✅ |
| D4 | 用户旅程与核心场景 | D4_用户旅程与核心场景.md | ✅ |
| D5 | 数据模型与实体关系 | D5_数据模型与实体关系.md | ✅ |
| D6 | 领域术语表 | D6_领域术语表.md | ✅ |
| D7 | 项目现状与版本历史 | D7_项目现状与版本历史.md | ✅ |
| D8 | 风险与技术债务评估 | D8_风险与技术债务评估.md | ✅ |
| D9 | 关键决策记录 | D9_关键决策记录.md | ✅ |
| D10 | 系统架构与能力清单 | D10_系统架构与能力清单.md | ✅ |
| D11 | 第三方服务与集成依赖 | D11_第三方服务与集成依赖.md | ✅ |
| A1 | 数据埋点与监控现状 | A1_数据埋点与监控现状.md | ✅ |

## 能力边界说明

本套文档从代码库自动分析生成。代码能回答"做了什么"和"怎么运转"，但无法回答"为什么这样做"和"商业目标是什么"。

标注 [推断，需验证] 的内容为基于代码间接推导，需产品经理通过干系人访谈确认。
标注 "PM 待补充" 的内容为代码无法提供、需要外部输入的信息。

## 快速概览

### 项目核心数据
- **总代码文件**: 80+ TypeScript/React 文件
- **总提交数**: 243 次
- **贡献者**: 15 人（核心 3 人：Nick Huang, Developer, bracesproul）
- **功能完成度**: 92% 已完成（47/51），8% 进行中（4 个 Ant Design X POC）
- **测试文件**: 21 个（Jest 单元测试 + Playwright E2E）
- **技术债务**: 2 个 TODO，26 处 `as any`，30+ console 语句
- **安全关注点**: JWT 存储在 localStorage（XSS 风险）

### 核心架构要点
1. **三层认证**: Middleware(路由) → fetchInterceptor(请求) → ClientProvider(SDK)
2. **流式通信**: LangGraph SDK `useStream` (WebSocket) → React 实时渲染
3. **Provider 层级**: ClientInitializer → AuthProvider → AuthGuard → NuqsAdapter → AntdProvider → ClientProvider → ChatProvider
4. **设计系统**: Azune 设计系统 (CSS Variables) + shadcn/ui (Radix) + Ant Design X (Feature Flag)
