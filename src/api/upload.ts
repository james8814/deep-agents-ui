/**
 * 文件上传 API
 *
 * 官方参考方案实现：
 * 1. 上传文件到后端存储
 * 2. 获取文件路径
 * 3. 在消息中引用文件路径
 */

import {
  AUTH_SERVER,
  fetchWithCredentials,
  refreshToken,
  emitAuthError,
} from "./client";
import { TOKEN_KEY } from "@/lib/constants";

// 统一的文件类型配置
export const ACCEPTED_FILE_TYPES = [
  // 图片
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // 文档
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  // 文本
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/html",
  "text/css",
  "text/yaml",
  "application/yaml",
  // 代码
  "text/javascript",
  "application/javascript",
  "application/json",
  "text/typescript",
  "application/typescript",
  "text/x-python",
  "application/x-python",
  // 其他扩展名
  ".md",
  ".txt",
  ".pdf",
  ".csv",
  ".json",
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
  ".py",
  ".html",
  ".css",
  ".svg",
  ".docx",
  ".pptx",
  ".xlsx",
  ".yaml",
  ".yml",
  ".sql",
  ".zip",
  ".tar",
  ".gz",
  ".rar",
].join(",");

// 最大文件大小：100MB
export const MAX_UPLOAD_SIZE = 100 * 1024 * 1024;

export interface UploadFileResponse {
  success: boolean;
  path: string; // 虚拟路径，格式: "/uploads/{user_id}/{filename}"
  filename: string; // 原始文件名
  size: number; // 文件大小（字节）
  message: string;
}

export interface UploadProgressCallback {
  (progress: number): void;
}

/**
 * 内部:执行一次 XHR 上传。
 * P1-3: 不做 refresh/重试,只负责单次网络操作。错误对象附 statusCode。
 */
function uploadOnce(
  file: File,
  onProgress?: UploadProgressCallback
): Promise<UploadFileResponse> {
  const formData = new FormData();
  formData.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });
    }

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response: UploadFileResponse = JSON.parse(xhr.responseText);
          resolve(response);
        } catch {
          reject(Object.assign(new Error("解析响应失败"), { statusCode: xhr.status }));
        }
      } else {
        let message = `上传失败: ${xhr.statusText}`;
        try {
          const parsed = JSON.parse(xhr.responseText);
          message = parsed.detail || message;
        } catch {
          // 保留默认 message
        }
        reject(Object.assign(new Error(message), { statusCode: xhr.status }));
      }
    });

    xhr.addEventListener("error", () => {
      reject(Object.assign(new Error("网络错误，请检查连接"), { statusCode: 0 }));
    });

    xhr.addEventListener("abort", () => {
      reject(new Error("上传已取消"));
    });

    xhr.open("POST", `${AUTH_SERVER}/api/upload`);

    // XHR 不走 fetchInterceptor,手动从 localStorage 读 token
    const token =
      typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    xhr.send(formData);
  });
}

/**
 * 上传单个文件(P1-3:函数级重试 + 401 自动 refresh + auth-error 派发)
 *
 * @param file 要上传的文件
 * @param onProgress 上传进度回调（0-100）
 * @returns 上传结果，包含文件路径
 */
export async function uploadFile(
  file: File,
  onProgress?: UploadProgressCallback
): Promise<UploadFileResponse> {
  try {
    return await uploadOnce(file, onProgress);
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    if (statusCode !== 401) throw err;

    // 401: 尝试 refresh 后用全新 XHR 重发一次(XHR 不可复用,必须新建)
    try {
      await refreshToken();
    } catch {
      emitAuthError();
      throw err;
    }
    // 第二次 upload。若仍返回 401(罕见:refresh 成功但服务端立即二次吊销),
    // 也要派发 auth-error,避免用户卡在错误 toast 上没有 redirect
    try {
      return await uploadOnce(file, onProgress);
    } catch (err2: unknown) {
      if ((err2 as { statusCode?: number })?.statusCode === 401) {
        emitAuthError();
      }
      throw err2;
    }
  }
}

/**
 * 删除已上传的文件
 *
 * @param path 文件虚拟路径，格式: "/uploads/{user_id}/{filename}"
 * @returns 删除结果
 */
export async function deleteUploadedFile(
  path: string
): Promise<{ success: boolean; message: string }> {
  // 路径格式: /uploads/{user_id}/{filename}
  const parts = path.split("/").filter(Boolean);
  // parts: ["uploads", "{user_id}", "{filename}"]
  if (parts.length < 3 || parts[0] !== "uploads") {
    throw new Error("无效的文件路径");
  }
  const userId = parts[1];
  const filename = parts[2];

  // 使用 fetchWithCredentials 调用 API（自动添加 Bearer Token + 401 自动刷新重试）
  return fetchWithCredentials<{ success: boolean; message: string }>(
    `${AUTH_SERVER}/api/uploads/${userId}/${filename}`,
    { method: "DELETE" }
  );
}

/**
 * 批量上传文件
 *
 * @param files 文件列表
 * @param onProgress 每个文件的上传进度回调 (fileIndex, progress)
 * @returns 上传结果列表
 */
export async function uploadFiles(
  files: File[],
  onProgress?: (fileIndex: number, progress: number) => void
): Promise<UploadFileResponse[]> {
  const results: UploadFileResponse[] = [];

  for (let i = 0; i < files.length; i++) {
    const result = await uploadFile(files[i], (progress) => {
      onProgress?.(i, progress);
    });
    results.push(result);
  }

  return results;
}

/**
 * 获取文件类型描述
 */
export function getFileTypeDescription(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";

  const typeMap: Record<string, string> = {
    pdf: "PDF文档",
    txt: "文本文件",
    md: "Markdown文档",
    csv: "CSV数据",
    json: "JSON文件",
    yaml: "YAML文件",
    yml: "YAML文件",
    py: "Python代码",
    js: "JavaScript代码",
    ts: "TypeScript代码",
    jsx: "React组件",
    tsx: "React组件",
    html: "HTML文档",
    css: "样式表",
    sql: "SQL脚本",
    png: "PNG图片",
    jpg: "JPEG图片",
    jpeg: "JPEG图片",
    gif: "GIF图片",
    webp: "WebP图片",
    svg: "SVG矢量图",
    zip: "ZIP压缩包",
    tar: "TAR归档",
    gz: "GZIP压缩",
    rar: "RAR压缩包",
    docx: "Word文档",
    pptx: "PowerPoint演示",
    xlsx: "Excel表格",
  };

  return typeMap[ext] || "文件";
}

/**
 * 获取文件类型提示（给 LLM 的建议）
 */
export function getFileTypeHint(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";

  const hints: Record<string, string> = {
    pdf: "使用 read_file 提取文本内容",
    txt: "使用 read_file 直接读取",
    md: "使用 read_file 读取 Markdown",
    csv: "使用 read_file 或 pandas 分析数据",
    json: "使用 read_file 解析 JSON 数据",
    yaml: "使用 read_file 解析配置",
    yml: "使用 read_file 解析配置",
    py: "使用 read_file 读取代码",
    js: "使用 read_file 读取代码",
    ts: "使用 read_file 读取代码",
    sql: "使用 read_file 读取 SQL 脚本",
    png: "使用 execute + tesseract OCR 识别文字（如需）",
    jpg: "使用 execute + tesseract OCR 识别文字（如需）",
    jpeg: "使用 execute + tesseract OCR 识别文字（如需）",
    zip: "使用 execute + unzip 解压后查看",
    docx: "使用 read_file 提取文本内容",
    pptx: "使用 read_file 提取内容",
    xlsx: "使用 read_file 或 pandas 读取表格数据",
  };

  return hints[ext] || "使用 read_file 读取";
}

/**
 * 构造包含文件引用的消息内容
 *
 * @param message 用户原始消息
 * @param filePaths 文件路径列表
 * @returns 构造后的完整消息
 */
export function constructMessageWithFiles(
  message: string,
  files: { path: string; filename: string }[]
): string {
  if (files.length === 0) {
    return message;
  }

  // 构建文件引用部分
  const fileReferences = files.map(({ path, filename }) => {
    const fileType = getFileTypeDescription(filename);
    const hint = getFileTypeHint(filename);
    return `- ${path} (${fileType}) - ${hint}`;
  });

  // 组合消息
  const parts: string[] = [];

  if (message.trim()) {
    parts.push(message.trim());
  }

  parts.push("[已上传文件]");
  parts.push(fileReferences.join("\n"));
  parts.push("\n请根据需要读取和分析这些文件。");

  return parts.join("\n\n");
}

/**
 * 检查文件类型是否允许上传
 */
export function isAllowedFileType(filename: string): boolean {
  const allowedExtensions = [
    ".txt",
    ".pdf",
    ".csv",
    ".json",
    ".md",
    ".yaml",
    ".yml",
    ".py",
    ".js",
    ".ts",
    ".jsx",
    ".tsx",
    ".html",
    ".css",
    ".sql",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".svg",
    ".zip",
    ".tar",
    ".gz",
    ".rar",
    ".docx",
    ".pptx",
    ".xlsx",
  ];

  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return allowedExtensions.includes(`.${ext}`);
}

/**
 * 格式化文件大小显示
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
