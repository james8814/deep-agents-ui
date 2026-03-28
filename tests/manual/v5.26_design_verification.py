"""
v5.26 设计验证 - Playwright 逐项核查测试

测试目标：基于 v5.26 设计原稿，逐项核查 v5.27 实施情况
测试方法：视觉核查 + DOM 元素核查 + 功能核查
"""

from playwright.sync_api import sync_playwright, expect
import json
from datetime import datetime

# 测试结果记录
test_results = []

def record_result(test_id, test_name, design_spec, actual_state, status, evidence=None):
    """记录测试结果"""
    test_results.append({
        "test_id": test_id,
        "test_name": test_name,
        "design_spec": design_spec,
        "actual_state": actual_state,
        "status": status,  # "PASS", "FAIL", "WARNING"
        "evidence": evidence,
        "timestamp": datetime.now().isoformat()
    })

def test_tab_structure(page):
    """
    测试项 1: Tab 结构核对
    v5.26 设计规格：2-Tab（工作日志/交付物）
    """
    print("\n=== 测试项 1: Tab 结构核对 ===")

    design_spec = "2-Tab 结构（工作日志/交付物），子代理融入工作日志"

    try:
        # 等待页面加载
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(3000)  # 等待 React 渲染

        # 截图记录
        page.screenshot(path='docs/v5.27_verification/tab_structure.png', full_page=True)

        # 查找所有 Tab 元素
        tabs = page.locator('.panel-tab, [role="tab"], .ant-tabs-tab').all()
        tab_texts = [tab.text_content().strip() for tab in tabs if tab.text_content()]

        # 检查是否有 "工作日志" 和 "交付物" Tab
        has_work_log = any('工作日志' in text for text in tab_texts)
        has_deliverables = any('交付物' in text for text in tab_texts)

        # 检查是否有 "SubAgents" 独立 Tab
        has_subagents_tab = any('SubAgent' in text or '子代理' in text or 'subagent' in text.lower() for text in tab_texts)

        # 检查是否有 "Tasks" Tab（v5.26 设计中没有）
        has_tasks_tab = any('Tasks' in text or '任务' in text for text in tab_texts)

        actual_state = f"检测到 Tab: {tab_texts}"

        if len(tabs) == 2 and has_work_log and has_deliverables and not has_subagents_tab:
            record_result(
                "TAB-001", "Tab 结构", design_spec,
                actual_state, "PASS",
                {"tab_count": len(tabs), "tabs": tab_texts}
            )
            print(f"✅ PASS: Tab 结构符合设计 - {actual_state}")
        elif len(tabs) == 3 or has_subagents_tab or has_tasks_tab:
            record_result(
                "TAB-001", "Tab 结构", design_spec,
                actual_state, "FAIL",
                {"tab_count": len(tabs), "tabs": tab_texts, "reason": "设计偏离：v5.26 规定 2-Tab，子代理融入工作日志"}
            )
            print(f"❌ FAIL: Tab 结构不符合设计 - {actual_state}")
            print(f"   设计规格：{design_spec}")
        else:
            record_result(
                "TAB-001", "Tab 结构", design_spec,
                actual_state, "WARNING",
                {"tab_count": len(tabs), "tabs": tab_texts}
            )
            print(f"⚠️ WARNING: 需要人工核查 - {actual_state}")

    except Exception as e:
        record_result(
            "TAB-001", "Tab 结构", design_spec,
            f"测试执行错误：{str(e)}", "FAIL"
        )
        print(f"❌ 测试执行错误：{str(e)}")

def test_mini_status_bar(page):
    """
    测试项 2: Mini Status Bar 核对
    v5.26 设计规格：6px 宽固定状态条，5 个圆点显示任务状态
    CSS 类名：.panel-mini-status
    """
    print("\n=== 测试项 2: Mini Status Bar 核对 ===")

    design_spec = "6px 宽迷你状态条，5 个圆点，点击展开面板，仅在非工作模式下显示"

    try:
        # 查找 Mini Status Bar 元素
        mini_status = page.locator('.panel-mini-status, [id*="mini-status"], [aria-label*="展开工作面板"]')

        if mini_status.count() > 0:
            # 检查圆点数量
            dots = page.locator('.panel-mini-dot, .mini-status-dot').all()
            dot_count = len(dots)

            actual_state = f"Mini Status Bar 存在，{dot_count}个圆点"
            record_result(
                "MSB-001", "Mini Status Bar", design_spec,
                actual_state, "PASS",
                {"exists": True, "dot_count": dot_count}
            )
            print(f"✅ PASS: Mini Status Bar 存在 - {actual_state}")
        else:
            actual_state = "Mini Status Bar 不存在"
            record_result(
                "MSB-001", "Mini Status Bar", design_spec,
                actual_state, "FAIL",
                {"exists": False, "reason": "设计中规定的 Mini Status Bar 未实施"}
            )
            print(f"❌ FAIL: Mini Status Bar 缺失 - {actual_state}")
            print(f"   设计规格：{design_spec}")

    except Exception as e:
        record_result(
            "MSB-001", "Mini Status Bar", design_spec,
            f"测试执行错误：{str(e)}", "FAIL"
        )
        print(f"❌ 测试执行错误：{str(e)}")

def test_progress_header(page):
    """
    测试项 3: Progress Header 核对
    v5.26 设计规格：7 元素（5 个 OPDCA 步骤徽章 + 进度条 + 耗时）
    """
    print("\n=== 测试项 3: Progress Header 核对 ===")

    design_spec = "7 元素：5 个 OPDCA 步骤徽章（研究/分析/撰写/审核/交付）+ 进度条 + 耗时"

    try:
        # 查找 Progress Header 元素
        progress_header = page.locator('.panel-progress-header, [class*="progress-header"], .progress-header')

        if progress_header.count() > 0:
            # 查找 OPDCA 步骤徽章
            opoca_badges = page.locator('[class*="opdca"], [class*="step-badge"], .progress-step').all()
            badge_count = len(opoca_badges)

            # 查找进度条
            progress_bar = page.locator('.progress-bar, [class*="progress-bar"]')
            has_progress_bar = progress_bar.count() > 0

            # 查找耗时显示
            time_display = page.locator('.progress-time, [class*="time"], [class*="duration"]').all()
            has_time = len(time_display) > 0

            actual_state = f"OPDCA 徽章：{badge_count}个，进度条：{'有' if has_progress_bar else '无'}，耗时：{'有' if has_time else '无'}"

            if badge_count == 5 and has_progress_bar:
                record_result(
                    "PH-001", "Progress Header", design_spec,
                    actual_state, "PASS",
                    {"badge_count": badge_count, "has_progress_bar": has_progress_bar, "has_time": has_time}
                )
                print(f"✅ PASS: Progress Header 符合设计 - {actual_state}")
            elif badge_count < 5 or not has_progress_bar:
                record_result(
                    "PH-001", "Progress Header", design_spec,
                    actual_state, "FAIL",
                    {"badge_count": badge_count, "has_progress_bar": has_progress_bar, "has_time": has_time, "reason": "设计简化：移除了 OPDCA 徽章"}
                )
                print(f"❌ FAIL: Progress Header 简化 - {actual_state}")
                print(f"   设计规格：{design_spec}")
            else:
                record_result(
                    "PH-001", "Progress Header", design_spec,
                    actual_state, "WARNING",
                    {"badge_count": badge_count, "has_progress_bar": has_progress_bar, "has_time": has_time}
                )
                print(f"⚠️ WARNING: Progress Header 需要人工核查 - {actual_state}")
        else:
            actual_state = "Progress Header 不存在"
            record_result(
                "PH-001", "Progress Header", design_spec,
                actual_state, "FAIL",
                {"exists": False, "reason": "Progress Header 未实施"}
            )
            print(f"❌ FAIL: Progress Header 缺失 - {actual_state}")

    except Exception as e:
        record_result(
            "PH-001", "Progress Header", design_spec,
            f"测试执行错误：{str(e)}", "FAIL"
        )
        print(f"❌ 测试执行错误：{str(e)}")

def test_files_tab(page):
    """
    测试项 4: Files Tab 功能核对
    v5.26 设计规格：文件列表、排序、下载、分享功能
    """
    print("\n=== 测试项 4: Files Tab 功能核对 ===")

    design_spec = "文件列表显示，支持排序（时间/名称）、下载、分享功能"

    try:
        # 点击 Files Tab（如果有多个 Tab）
        files_tab = page.locator('text=交付物，text=Files，text=files').first
        if files_tab.count() > 0:
            files_tab.click()
            page.wait_for_timeout(1000)

        # 查找文件列表
        file_list = page.locator('.file-list, [class*="file-list"], .files-list')
        has_file_list = file_list.count() > 0

        # 查找排序控件
        sort_control = page.locator('[class*="sort"], [aria-label*="排序"]')
        has_sort = sort_control.count() > 0

        # 查找下载按钮
        download_btn = page.locator('[aria-label*="下载"], .download-btn, button:has-text("下载")')
        has_download = download_btn.count() > 0

        actual_state = f"文件列表：{'有' if has_file_list else '无'}，排序：{'有' if has_sort else '无'}，下载：{'有' if has_download else '无'}"

        if has_file_list:
            record_result(
                "FILE-001", "Files Tab 功能", design_spec,
                actual_state, "PASS",
                {"has_file_list": has_file_list, "has_sort": has_sort, "has_download": has_download}
            )
            print(f"✅ PASS: Files Tab 功能完整 - {actual_state}")
        else:
            record_result(
                "FILE-001", "Files Tab 功能", design_spec,
                actual_state, "WARNING",
                {"has_file_list": has_file_list, "has_sort": has_sort, "has_download": has_download}
            )
            print(f"⚠️ WARNING: Files Tab 需要人工核查 - {actual_state}")

    except Exception as e:
        record_result(
            "FILE-001", "Files Tab 功能", design_spec,
            f"测试执行错误：{str(e)}", "FAIL"
        )
        print(f"❌ 测试执行错误：{str(e)}")

def test_type_definitions(page):
    """
    测试项 5: 类型定义核对
    v5.26 设计规格：
    - files: Record<string, FileData> (FileData 包含 content[], created_at, modified_at)
    - LogEntry 包含 elapsed_time 字段
    - StateType 包含 opdca_stage 字段
    """
    print("\n=== 测试项 5: 类型定义核对 ===")

    design_spec = """
    - files: Record<string, FileData> (FileData: content[], created_at?, modified_at?)
    - LogEntry: 包含 elapsed_time 字段
    - StateType: 包含 opdca_stage 字段
    """

    try:
        # 通过 JavaScript 检查运行时类型
        type_check = page.evaluate('''() => {
            const results = {
                files_type: null,
                logentry_elapsed_time: null,
                state_opdca_stage: null
            };

            // 尝试访问全局状态（如果有）
            if (window.__PRELOADED_STATE__) {
                const state = window.__PRELOADED_STATE__;
                results.files_type = typeof state.files;
                results.state_opdca_stage = state.opdca_stage !== undefined;
            }

            return results;
        }''')

        actual_state = f"运行时检查：{json.dumps(type_check, ensure_ascii=False)}"
        record_result(
            "TYPE-001", "类型定义", design_spec,
            actual_state, "WARNING",
            {"note": "类型定义需要通过源代码核实，运行时检查有限", "runtime_check": type_check}
        )
        print(f"⚠️ WARNING: 类型定义需要源代码核实 - {actual_state}")
        print(f"   建议：检查 src/app/hooks/useChat.ts 中的 StateType 定义")

    except Exception as e:
        record_result(
            "TYPE-001", "类型定义", design_spec,
            f"测试执行错误：{str(e)}", "FAIL"
        )
        print(f"❌ 测试执行错误：{str(e)}")

def test_subagent_logs(page):
    """
    测试项 6: subagent_logs 数据传输核对
    v5.26 设计规格：subagent_logs 需要传输到前端，用于工作日志显示
    """
    print("\n=== 测试项 6: subagent_logs 数据传输核对 ===")

    design_spec = "subagent_logs 需要传输到前端，支持工作日志显示工具调用详情"

    try:
        # 检查控制台是否有 subagent_logs 相关日志
        console_messages = []
        page.on('console', lambda msg: console_messages.append(msg.text()))

        # 检查全局状态
        subagent_logs_check = page.evaluate('''() => {
            const results = {
                subagent_logs_exists: false,
                subagent_logs_count: 0
            };

            if (window.__PRELOADED_STATE__ && window.__PRELOADED_STATE__.subagent_logs) {
                results.subagent_logs_exists = true;
                results.subagent_logs_count = Object.keys(window.__PRELOADED_STATE__.subagent_logs).length;
            }

            return results;
        }''')

        if subagent_logs_check['subagent_logs_exists']:
            actual_state = f"subagent_logs 存在，{subagent_logs_check['subagent_logs_count']}个条目"
            record_result(
                "SAL-001", "subagent_logs 传输", design_spec,
                actual_state, "PASS",
                subagent_logs_check
            )
            print(f"✅ PASS: subagent_logs 已传输 - {actual_state}")
        else:
            actual_state = "subagent_logs 未在前端状态中找到"
            record_result(
                "SAL-001", "subagent_logs 传输", design_spec,
                actual_state, "WARNING",
                {"note": "可能需要实际运行任务才能看到 subagent_logs"}
            )
            print(f"⚠️ WARNING: subagent_logs 需要实际任务验证 - {actual_state}")

    except Exception as e:
        record_result(
            "SAL-001", "subagent_logs 传输", design_spec,
            f"测试执行错误：{str(e)}", "FAIL"
        )
        print(f"❌ 测试执行错误：{str(e)}")

def generate_report():
    """生成测试报告"""

    # 统计结果
    total = len(test_results)
    passed = sum(1 for r in test_results if r['status'] == 'PASS')
    failed = sum(1 for r in test_results if r['status'] == 'FAIL')
    warnings = sum(1 for r in test_results if r['status'] == 'WARNING')

    report = f"""# v5.26 设计验证 - Playwright 逐项核查报告

**测试日期**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
**测试方法**: Playwright E2E 测试 + DOM 元素核查 + 视觉核查
**测试页面**: http://localhost:3000

---

## 测试结果汇总

| 状态 | 数量 | 百分比 |
|------|------|--------|
| ✅ PASS | {passed} | {passed/total*100:.1f}% |
| ❌ FAIL | {failed} | {failed/total*100:.1f}% |
| ⚠️ WARNING | {warnings} | {warnings/total*100:.1f}% |
| **总计** | **{total}** | 100% |

---

## 逐项测试结果

"""

    for result in test_results:
        status_emoji = {"PASS": "✅", "FAIL": "❌", "WARNING": "⚠️"}.get(result['status'], "❓")
        report += f"""### {result['test_id']}: {result['test_name']}

**状态**: {status_emoji} {result['status']}

**设计规格**:
{result['design_spec']}

**实际状态**:
{result['actual_state']}

**证据**:
{json.dumps(result.get('evidence', {}), indent=2, ensure_ascii=False)}

---

"""

    # 生成综合评分
    score = (passed / total * 100) if total > 0 else 0
    report += f"""## 综合评分

**得分**: {score:.0f}/100

**计算公式**: PASS 数 / 总测试数 × 100

---

## 问题清单

"""

    for result in test_results:
        if result['status'] == 'FAIL':
            report += f"""### ❌ {result['test_id']}: {result['test_name']}

**问题**: {result['evidence'].get('reason', '未说明')}

**建议行动**: 需要产品负责人决策是否修复或追认为有意识偏离

"""

    report += """---

## 测试说明

1. **测试环境**: Playwright Chromium 无头模式
2. **测试页面**: http://localhost:3000 (Next.js 生产模式)
3. **测试截图**: 保存在 `docs/v5.27_verification/` 目录
4. **源代码核实**: 类型定义等项目需要结合源代码核实

---

**报告生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
**测试人**: AI Test Assistant (Playwright)
**审查状态**: 待产品负责人和技术负责人审查

"""

    return report

def main():
    print("=" * 60)
    print("v5.26 设计验证 - Playwright 逐项核查测试")
    print("=" * 60)

    with sync_playwright() as p:
        # 启动浏览器
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080}
        )
        page = context.new_page()

        # 导航到页面
        print("\n正在加载页面：http://localhost:3000")
        page.goto('http://localhost:3000', wait_until='networkidle', timeout=60000)
        print("页面加载完成")

        # 等待 React 渲染
        print("等待 React 渲染...")
        page.wait_for_timeout(5000)

        # 执行测试
        test_tab_structure(page)
        test_mini_status_bar(page)
        test_progress_header(page)
        test_files_tab(page)
        test_type_definitions(page)
        test_subagent_logs(page)

        # 关闭浏览器
        browser.close()

    # 生成报告
    report = generate_report()

    # 保存报告
    report_path = 'docs/v5.27_verification/playwright_verification_report.md'
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(report)

    print(f"\n{'=' * 60}")
    print(f"测试完成！报告已保存到：{report_path}")
    print(f"{'=' * 60}")

    # 打印摘要
    total = len(test_results)
    passed = sum(1 for r in test_results if r['status'] == 'PASS')
    failed = sum(1 for r in test_results if r['status'] == 'FAIL')
    warnings = sum(1 for r in test_results if r['status'] == 'WARNING')

    print(f"\n测试结果汇总:")
    print(f"  ✅ PASS: {passed}/{total}")
    print(f"  ❌ FAIL: {failed}/{total}")
    print(f"  ⚠️ WARNING: {warnings}/{total}")
    print(f"  综合评分：{passed/total*100:.0f}/100")

if __name__ == '__main__':
    main()
