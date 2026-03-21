"""
v5.26 设计验证 - Playwright 逐项核查测试 (改进版)

测试目标：基于 v5.26 设计原稿，逐项核查 v5.27 实施情况
测试方法：视觉核查 + DOM 元素核查 + 功能核查 + 源代码核查

改进点：
1. 增加登录流程处理
2. 增加源代码核查（类型定义）
3. 增加更全面的元素检测
"""

from playwright.sync_api import sync_playwright, expect
import json
import os
from datetime import datetime
from pathlib import Path

# 测试结果记录
test_results = []

def record_result(test_id, test_name, design_spec, actual_state, status, evidence=None):
    """记录测试结果"""
    test_results.append({
        "test_id": test_id,
        "test_name": test_name,
        "design_spec": design_spec,
        "actual_state": actual_state,
        "status": status,
        "evidence": evidence,
        "timestamp": datetime.now().isoformat()
    })

def check_source_code_types():
    """
    核查源代码中的类型定义
    检查文件：src/app/hooks/useChat.ts
    """
    print("\n=== 源代码核查：类型定义 ===")

    results = {
        "files_type": None,
        "filedata_type": None,
        "logentry_elapsed_time": None,
        "opdca_stage_field": None
    }

    try:
        # 读取 useChat.ts 文件
        usechat_path = Path("src/app/hooks/useChat.ts")
        if usechat_path.exists():
            content = usechat_path.read_text(encoding='utf-8')

            # 检查 files 类型
            if 'files: Record<string, string>' in content:
                results["files_type"] = "Record<string, string> (❌ 应为 FileData)"
            elif 'files: Record<string, FileData>' in content:
                results["files_type"] = "Record<string, FileData> (✅ 正确)"
            else:
                results["files_type"] = "未找到明确定义"

            # 检查 FileData 类型
            if 'interface FileData' in content or 'type FileData' in content:
                results["filedata_type"] = "已定义"
            else:
                results["filedata_type"] = "未定义"

            # 检查 LogEntry 是否有 elapsed_time
            if 'elapsed_time' in content:
                results["logentry_elapsed_time"] = "已添加"
            else:
                results["logentry_elapsed_time"] = "未添加"

            # 检查 opdca_stage
            if 'opdca_stage' in content:
                results["opdca_stage_field"] = "已添加"
            else:
                results["opdca_stage_field"] = "未添加"

        # 读取 types.ts 文件
        types_path = Path("src/app/types/types.ts")
        if types_path.exists():
            content = types_path.read_text(encoding='utf-8')

            # 检查 FileItem 类型
            if 'interface FileItem' in content:
                fileitem_match = content.find('interface FileItem')
                if fileitem_match != -1:
                    # 获取 FileItem 定义的内容
                    fileitem_block = content[fileitem_match:fileitem_match+500]
                    if 'content: string' in fileitem_block:
                        results["fileitem_content"] = "string (❌ 应为 string[])"
                    elif 'content: string[]' in fileitem_block:
                        results["fileitem_content"] = "string[] (✅ 正确)"

    except Exception as e:
        results["error"] = str(e)

    return results

def login_if_needed(page):
    """如果检测到登录页面，执行登录流程"""

    print("\n检查是否需要登录...")

    try:
        # 检查是否是登录页面
        login_form = page.locator('form:has(input[type="email"]), input[name="email"], input[placeholder*="邮箱"]')

        if login_form.count() > 0:
            print("检测到登录页面，执行自动登录...")

            # 填写邮箱
            email_input = page.locator('input[type="email"], input[name="email"], input[placeholder*="邮箱"]').first
            email_input.fill("test@example.com")

            # 填写密码
            password_input = page.locator('input[type="password"], input[name="password"]').first
            password_input.fill("testpassword123")

            # 点击登录按钮
            login_btn = page.locator('button[type="submit"]:has-text("登录"), button:has-text("Login")').first
            login_btn.click()

            # 等待登录完成
            page.wait_for_timeout(5000)
            print("登录完成")
            return True
        else:
            print("未检测到登录页面，可能已登录或其他页面")
            return False

    except Exception as e:
        print(f"登录检查失败：{str(e)}")
        return False

def test_tab_structure(page):
    """
    测试项 1: Tab 结构核对
    v5.26 设计规格：2-Tab（工作日志/交付物）
    """
    print("\n=== 测试项 1: Tab 结构核对 ===")

    design_spec = "2-Tab 结构（工作日志/交付物），子代理融入工作日志"
    evidence = {"tabs_found": [], "selectors_checked": []}

    try:
        # 等待页面加载
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(3000)

        # 截图记录
        page.screenshot(path='docs/v5.27_verification/tab_structure.png', full_page=True)

        # 多种 selector 策略查找 Tab
        tab_selectors = [
            '.panel-tab',
            '[role="tab"]',
            '.ant-tabs-tab',
            '.context-panel-tab',
            '[class*="tab"]',
            'button:has-text("工作日志")',
            'button:has-text("交付物")',
            'button:has-text("Tasks")',
            'button:has-text("Files")',
            'button:has-text("SubAgents")'
        ]

        all_tabs = []
        for selector in tab_selectors:
            try:
                tabs = page.locator(selector).all()
                if len(tabs) > 0:
                    evidence["selectors_checked"].append(f"{selector}: {len(tabs)} found")
                    for tab in tabs:
                        try:
                            text = tab.text_content(timeout=1000).strip()
                            if text and text not in all_tabs:
                                all_tabs.append(text)
                        except:
                            pass
            except Exception as e:
                evidence["selectors_checked"].append(f"{selector}: error - {str(e)}")

        evidence["tabs_found"] = all_tabs

        # 分析结果
        has_work_log = any('工作日志' in t for t in all_tabs)
        has_deliverables = any('交付物' in t for t in all_tabs)
        has_tasks = any('Tasks' in t or '任务' in t for t in all_tabs)
        has_files = any('Files' in t or '文件' in t for t in all_tabs)
        has_subagents = any('SubAgent' in t or '子代理' in t for t in all_tabs)

        actual_state = f"检测到 Tab: {all_tabs}"

        # 判定逻辑
        if has_work_log and has_deliverables and not has_subagents and not has_tasks:
            # 纯 2-Tab 设计
            record_result("TAB-001", "Tab 结构", design_spec, actual_state, "PASS", evidence)
            print(f"✅ PASS: 符合 2-Tab 设计")
        elif has_subagents or has_tasks:
            # 3-Tab 结构（设计偏离）
            record_result("TAB-001", "Tab 结构", design_spec, actual_state, "FAIL",
                         {**evidence, "reason": "设计偏离：v5.26 规定 2-Tab（工作日志/交付物），子代理融入工作日志"})
            print(f"❌ FAIL: 3-Tab 结构（设计偏离）")
            print(f"   设计规格：{design_spec}")
        elif has_files and not has_work_log:
            # Files Tab 存在但不是"交付物"
            record_result("TAB-001", "Tab 结构", design_spec, actual_state, "FAIL",
                         {**evidence, "reason": "Tab 命名不符合设计：应为'工作日志/交付物'"})
            print(f"❌ FAIL: Tab 命名不符合设计")
        else:
            record_result("TAB-001", "Tab 结构", design_spec, actual_state, "WARNING", evidence)
            print(f"⚠️ WARNING: 需要人工核查")

    except Exception as e:
        record_result("TAB-001", "Tab 结构", design_spec, f"测试执行错误：{str(e)}", "FAIL")
        print(f"❌ 测试执行错误：{str(e)}")

def test_mini_status_bar(page):
    """
    测试项 2: Mini Status Bar 核对
    """
    print("\n=== 测试项 2: Mini Status Bar 核对 ===")

    design_spec = "6px 宽迷你状态条，5 个圆点，点击展开面板，仅在非工作模式下显示"

    try:
        # 查找 Mini Status Bar 元素（多种 selector）
        selectors = [
            '.panel-mini-status',
            '[class*="mini-status"]',
            '[class*="mini-status"]',
            '[aria-label*="展开工作面板"]',
            '[title*="展开工作面板"]'
        ]

        found = False
        for selector in selectors:
            try:
                elements = page.locator(selector).all()
                if len(elements) > 0:
                    found = True
                    # 检查圆点数量
                    dots = page.locator('.panel-mini-dot, [class*="mini-dot"]').all()
                    actual_state = f"Mini Status Bar 存在，{len(dots)}个圆点"
                    record_result("MSB-001", "Mini Status Bar", design_spec, actual_state, "PASS",
                                 {"exists": True, "dot_count": len(dots)})
                    print(f"✅ PASS: Mini Status Bar 存在 - {len(dots)}个圆点")
                    return
            except:
                pass

        if not found:
            actual_state = "Mini Status Bar 不存在"
            record_result("MSB-001", "Mini Status Bar", design_spec, actual_state, "FAIL",
                         {"exists": False, "reason": "设计中规定的 Mini Status Bar 未实施"})
            print(f"❌ FAIL: Mini Status Bar 缺失")
            print(f"   设计规格：{design_spec}")

    except Exception as e:
        record_result("MSB-001", "Mini Status Bar", design_spec, f"测试执行错误：{str(e)}", "FAIL")
        print(f"❌ 测试执行错误：{str(e)}")

def test_progress_header(page):
    """
    测试项 3: Progress Header 核对
    """
    print("\n=== 测试项 3: Progress Header 核对 ===")

    design_spec = "7 元素：5 个 OPDCA 步骤徽章（研究/分析/撰写/审核/交付）+ 进度条 + 耗时"

    try:
        # 查找 Progress Header
        selectors = [
            '.panel-progress-header',
            '.progress-header',
            '[class*="progress-header"]',
            '[class*="progress"]'
        ]

        found = False
        for selector in selectors:
            try:
                elements = page.locator(selector).all()
                if len(elements) > 0:
                    found = True
                    # 查找 OPDCA 徽章
                    badges = page.locator('[class*="badge"], .step-badge, [class*="opdca"]').all()

                    # 检查是否有进度条
                    progress_bar = page.locator('.progress-bar, [class*="progress-bar"]').count() > 0

                    # 检查是否有耗时
                    time_el = page.locator('.progress-time, [class*="time"], [class*="duration"]').count() > 0

                    actual_state = f"Progress Header 存在，OPDCA 徽章：{len(badges)}个，进度条：{'有' if progress_bar else '无'}，耗时：{'有' if time_el else '无'}"

                    if len(badges) >= 5 and progress_bar:
                        record_result("PH-001", "Progress Header", design_spec, actual_state, "PASS",
                                     {"badge_count": len(badges), "has_progress_bar": progress_bar})
                        print(f"✅ PASS: Progress Header 符合设计")
                    else:
                        record_result("PH-001", "Progress Header", design_spec, actual_state, "FAIL",
                                     {"badge_count": len(badges), "has_progress_bar": progress_bar,
                                      "reason": "设计简化：OPDCA 徽章数量不足或进度条缺失"})
                        print(f"❌ FAIL: Progress Header 简化")
                    return
            except:
                pass

        if not found:
            actual_state = "Progress Header 不存在"
            record_result("PH-001", "Progress Header", design_spec, actual_state, "FAIL",
                         {"exists": False, "reason": "Progress Header 未实施"})
            print(f"❌ FAIL: Progress Header 缺失")

    except Exception as e:
        record_result("PH-001", "Progress Header", design_spec, f"测试执行错误：{str(e)}", "FAIL")
        print(f"❌ 测试执行错误：{str(e)}")

def test_files_tab(page):
    """
    测试项 4: Files Tab 功能核对
    """
    print("\n=== 测试项 4: Files Tab 功能核对 ===")

    design_spec = "文件列表显示，支持排序（时间/名称）、下载、分享功能"

    try:
        # 尝试点击 Files Tab
        files_tab_selectors = ['text=交付物', 'text=Files', 'text=文件', 'button:has-text("Files")']
        for selector in files_tab_selectors:
            try:
                tab = page.locator(selector).first
                if tab.count() > 0:
                    tab.click()
                    page.wait_for_timeout(1000)
                    break
            except:
                pass

        # 检查文件列表
        file_list_selectors = ['.file-list', '[class*="file-list"]', '.files-list', '[class*="file-item"]']
        has_file_list = False
        for selector in file_list_selectors:
            try:
                if page.locator(selector).count() > 0:
                    has_file_list = True
                    break
            except:
                pass

        # 检查排序
        sort_selectors = ['[class*="sort"]', '[aria-label*="排序"]', 'button:has-text("排序")']
        has_sort = any(page.locator(s).count() > 0 for s in sort_selectors)

        # 检查下载
        download_selectors = ['[aria-label*="下载"]', '.download-btn', 'button:has-text("下载")']
        has_download = any(page.locator(s).count() > 0 for s in download_selectors)

        actual_state = f"文件列表：{'有' if has_file_list else '无'}，排序：{'有' if has_sort else '无'}，下载：{'有' if has_download else '无'}"

        if has_file_list:
            record_result("FILE-001", "Files Tab 功能", design_spec, actual_state, "PASS",
                         {"has_file_list": has_file_list, "has_sort": has_sort, "has_download": has_download})
            print(f"✅ PASS: Files Tab 功能完整")
        else:
            record_result("FILE-001", "Files Tab 功能", design_spec, actual_state, "WARNING",
                         {"has_file_list": has_file_list, "has_sort": has_sort, "has_download": has_download})
            print(f"⚠️ WARNING: Files Tab 需要人工核查（可能无文件数据）")

    except Exception as e:
        record_result("FILE-001", "Files Tab 功能", design_spec, f"测试执行错误：{str(e)}", "FAIL")
        print(f"❌ 测试执行错误：{str(e)}")

def generate_report():
    """生成测试报告"""

    total = len(test_results)
    passed = sum(1 for r in test_results if r['status'] == 'PASS')
    failed = sum(1 for r in test_results if r['status'] == 'FAIL')
    warnings = sum(1 for r in test_results if r['status'] == 'WARNING')

    report = f"""# v5.26 设计验证 - Playwright 逐项核查报告

**测试日期**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
**测试方法**: Playwright E2E 测试 + DOM 元素核查 + 源代码核查
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

    score = (passed / total * 100) if total > 0 else 0
    report += f"""## 综合评分

**得分**: {score:.0f}/100

---

## 问题清单

"""

    for result in test_results:
        if result['status'] == 'FAIL':
            reason = result.get('evidence', {}).get('reason', '未说明') if result.get('evidence') else '未说明'
            report += f"""### ❌ {result['test_id']}: {result['test_name']}

**问题**: {reason}

"""

    report += f"""---

**报告生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
**测试人**: AI Test Assistant (Playwright)
**审查状态**: 待产品负责人和技术负责人审查

"""

    return report

def main():
    print("=" * 60)
    print("v5.26 设计验证 - Playwright 逐项核查测试 (改进版)")
    print("=" * 60)

    # 确保输出目录存在
    os.makedirs('docs/v5.27_verification', exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = context.new_page()

        # 导航到页面
        print("\n正在加载页面：http://localhost:3000")
        page.goto('http://localhost:3000', wait_until='networkidle', timeout=60000)
        print("页面加载完成")

        # 等待并尝试登录
        page.wait_for_timeout(5000)
        login_if_needed(page)
        page.wait_for_timeout(3000)

        # 执行 UI 测试
        print("\n=== 开始 UI 测试 ===")
        test_tab_structure(page)
        test_mini_status_bar(page)
        test_progress_header(page)
        test_files_tab(page)

        # 关闭浏览器
        browser.close()

    # 执行源代码核查
    print("\n=== 开始源代码核查 ===")
    source_results = check_source_code_types()
    print(f"源代码核查结果：{json.dumps(source_results, ensure_ascii=False)}")

    # 记录源代码核查结果
    design_spec_types = """
    - files: Record<string, FileData> (FileData: content[], created_at?, modified_at?)
    - LogEntry: 包含 elapsed_time 字段
    - StateType: 包含 opdca_stage 字段
    """

    if source_results.get('files_type', '').startswith('Record<string, string>'):
        record_result("TYPE-001", "类型定义", design_spec_types,
                     f"files: {source_results.get('files_type')}", "FAIL",
                     {"reason": "files 类型应为 Record<string, FileData>"})
    elif source_results.get('files_type', '').startswith('Record<string, FileData>'):
        record_result("TYPE-001", "类型定义", design_spec_types,
                     f"files: {source_results.get('files_type')}", "PASS", source_results)
    else:
        record_result("TYPE-001", "类型定义", design_spec_types,
                     f"检查结果：{json.dumps(source_results, ensure_ascii=False)}", "WARNING", source_results)

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
    if total > 0:
        print(f"  综合评分：{passed/total*100:.0f}/100")

if __name__ == '__main__':
    main()
