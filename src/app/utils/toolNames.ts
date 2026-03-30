/**
 * 工具名称映射配置
 *
 * 将工具的代码名称映射为用户友好的中文名称
 * 支持多语言扩展（未来可添加英文、日文等）
 */

export interface ToolNameConfig {
  /** 代码名称（后端工具名） */
  codeName: string;
  /** 用户友好的显示名称（中文） */
  displayName: string;
  /** 工具描述（可选，用于 Tooltip） */
  description?: string;
  /** 工具分类（可选，用于分组显示） */
  category?: string;
}

/**
 * 工具名称映射表
 *
 * 维护说明：
 * 1. 新增工具时，需要在后端工具定义和此处同时添加映射
 * 2. 保持 codeName 与后端工具名称完全一致
 * 3. displayName 应简洁明了，适合用户阅读
 */
export const TOOL_NAME_MAPPING: Record<string, ToolNameConfig> = {
  // ===== PMAgent 核心工具 =====
  search: {
    codeName: "search",
    displayName: "网络搜索",
    description: "使用 Tavily API 搜索互联网信息",
    category: "信息检索",
  },
  fetch_content: {
    codeName: "fetch_content",
    displayName: "抓取网页内容",
    description: "使用 Playwright 抓取指定 URL 的内容",
    category: "信息检索",
  },
  task: {
    codeName: "task",
    displayName: "调用 SubAgent",
    description: "委派任务给专业的子代理执行",
    category: "任务管理",
  },

  // ===== 文件系统工具 =====
  ls: {
    codeName: "ls",
    displayName: "列出文件",
    description: "列出指定目录下的文件和子目录",
    category: "文件操作",
  },
  read_file: {
    codeName: "read_file",
    displayName: "读取文件",
    description: "读取文件内容，支持多种格式（PDF/Word/Excel/PPT/图片等）",
    category: "文件操作",
  },
  write_file: {
    codeName: "write_file",
    displayName: "写入文件",
    description: "创建或覆盖文件",
    category: "文件操作",
  },
  edit_file: {
    codeName: "edit_file",
    displayName: "编辑文件",
    description: "使用字符串替换编辑文件",
    category: "文件操作",
  },

  // ===== 项目管理工具 =====
  update_opdca_stage: {
    codeName: "update_opdca_stage",
    displayName: "更新工作流阶段",
    description: "更新 OPDCA 工作流的当前阶段",
    category: "工作流管理",
  },
  submit_deliverable: {
    codeName: "submit_deliverable",
    displayName: "提交交付物",
    description: "提交最终交付物供用户确认",
    category: "工作流管理",
  },
  write_todos: {
    codeName: "write_todos",
    displayName: "创建任务计划",
    description: "创建或更新任务计划列表",
    category: "任务管理",
  },

  // ===== PPT 相关工具 =====
  ppt_search_web: {
    codeName: "ppt_search_web",
    displayName: "PPT 网络搜索",
    description: "为 PPT 生成搜索互联网资料",
    category: "PPT 生成",
  },
  ppt_fetch_url: {
    codeName: "ppt_fetch_url",
    displayName: "PPT 抓取网页",
    description: "为 PPT 生成抓取网页内容",
    category: "PPT 生成",
  },
  ppt_download_file: {
    codeName: "ppt_download_file",
    displayName: "下载文件",
    description: "下载图片、文档等素材",
    category: "PPT 生成",
  },
  ppt_hil_approval: {
    codeName: "ppt_hil_approval",
    displayName: "PPT 审批",
    description: "等待用户审批 PPT 方案",
    category: "PPT 生成",
  },
  ppt_inspect_slide: {
    codeName: "ppt_inspect_slide",
    displayName: "检查幻灯片",
    description: "使用视觉模型检查幻灯片质量",
    category: "PPT 生成",
  },
  ppt_convert_html: {
    codeName: "ppt_convert_html",
    displayName: "生成 PPTX",
    description: "将 HTML 转换为 PowerPoint 文件",
    category: "PPT 生成",
  },

  // ===== 其他工具 =====
  generate_chart: {
    codeName: "generate_chart",
    displayName: "生成图表",
    description: "根据数据生成可视化图表",
    category: "数据分析",
  },

  // ===== SubAgent 类型 =====
  // 注意：这些不是工具，而是 SubAgent 的类型名称
  deep_research_agent: {
    codeName: "deep_research_agent",
    displayName: "深度研究代理",
    description: "执行 9 阶段深度研究流程的专业代理",
    category: "SubAgent",
  },
  research_agent: {
    codeName: "research_agent",
    displayName: "研究代理",
    description: "执行网络研究和信息收集",
    category: "SubAgent",
  },
  analysis_agent: {
    codeName: "analysis_agent",
    displayName: "分析代理",
    description: "执行数据分析和可视化",
    category: "SubAgent",
  },
  design_agent: {
    codeName: "design_agent",
    displayName: "设计代理",
    description: "执行产品设计和文档生成",
    category: "SubAgent",
  },
  writing_agent: {
    codeName: "writing_agent",
    displayName: "写作代理",
    description: "执行专业文档写作",
    category: "SubAgent",
  },
  document_agent: {
    codeName: "document_agent",
    displayName: "文档代理",
    description: "执行文档格式化和模板生成",
    category: "SubAgent",
  },
  reflection_agent: {
    codeName: "reflection_agent",
    displayName: "反思代理",
    description: "执行质量评估和反思",
    category: "SubAgent",
  },
  presentation_designer_agent: {
    codeName: "presentation_designer_agent",
    displayName: "演示文稿设计代理",
    description: "执行 PPT 设计和生成",
    category: "SubAgent",
  },
};

/**
 * 获取工具的显示名称
 *
 * @param codeName - 工具的代码名称
 * @param fallback - 如果未找到映射，返回的默认值（默认为 codeName）
 * @returns 用户友好的显示名称
 *
 * @example
 * getToolDisplayName("search") // 返回 "网络搜索"
 * getToolDisplayName("unknown_tool") // 返回 "unknown_tool"
 * getToolDisplayName("unknown_tool", "未知工具") // 返回 "未知工具"
 */
export function getToolDisplayName(
  codeName: string,
  fallback?: string
): string {
  const config = TOOL_NAME_MAPPING[codeName];
  return config?.displayName ?? (fallback ?? codeName);
}

/**
 * 获取工具的完整配置
 *
 * @param codeName - 工具的代码名称
 * @returns 工具配置对象，如果未找到则返回 undefined
 */
export function getToolConfig(codeName: string): ToolNameConfig | undefined {
  return TOOL_NAME_MAPPING[codeName];
}

/**
 * 获取所有工具的分类
 *
 * @returns 分类名称数组
 */
export function getToolCategories(): string[] {
  const categories = new Set<string>();
  Object.values(TOOL_NAME_MAPPING).forEach((config) => {
    if (config.category) {
      categories.add(config.category);
    }
  });
  return Array.from(categories);
}

/**
 * 按分类获取工具列表
 *
 * @param category - 分类名称
 * @returns 该分类下的所有工具配置
 */
export function getToolsByCategory(category: string): ToolNameConfig[] {
  return Object.values(TOOL_NAME_MAPPING).filter(
    (config) => config.category === category
  );
}