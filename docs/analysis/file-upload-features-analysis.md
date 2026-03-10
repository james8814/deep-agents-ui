# File Upload & Delivery Features - Backend Capability Analysis

> Date: 2026-02-15
> Scope: User requirements for file upload, sharing, referencing, and delivery preview
> Updated: Backend analysis completed

## User Requirements Summary

1. **用户消息输入支持文件上传** - File upload in user message input (图片, txt, pdf, md, docs, csv)
2. **文件分享功能** - Provide shareable URL for copying
3. **文件引用到对话框** - Reference files in the dialog/conversation
4. **Agent 交付文档预览卡片** - Delivery document preview card (agent 有标记)
5. **点击卡片弹出文件查看窗口** - Click card to open file viewer

---

## Backend Analysis Results

### deepagents Backend Capabilities ✅

**File Upload API exists:**

```python
# BackendProtocol interface
def upload_files(self, files: list[tuple[str, bytes]]) -> list[FileUploadResponse]
def download_files(self, paths: list[str]) -> list[FileDownloadResponse]

# Async versions
async def aupload_files(...)
async def adownload_files(...)
```

**Implemented in:**

- `StateBackend` ⚠️ (returns error - "not supported yet")
- `FilesystemBackend` ✅
- `StoreBackend` ✅
- `CompositeBackend` ✅
- `SandboxBackend` ✅

**FileData structure:**

```python
class FileData(TypedDict):
    content: list[str]       # Lines of the file
    created_at: str          # ISO 8601 timestamp
    modified_at: str         # ISO 8601 timestamp
```

**State schema:**

```python
class FilesystemState(AgentState):
    files: Annotated[dict[str, FileData], _file_data_reducer]
```

### File Type Handling Analysis

**Images:**

- CLI (`deepagents_cli/image_utils.py`) handles images via clipboard paste
- Converts to base64 and uses LangChain multimodal format:
  ```python
  {"type": "image_url", "image_url": {"url": "data:image/png;base64,..."}}
  ```
- Supported: PNG, JPEG, TIFF
- **No server-side parsing** - images passed directly to LLM

**Documents (PDF, DOCX, CSV, TXT, MD):**

- ⚠️ **No parsing middleware found**
- Files stored as raw bytes/text in backend
- LLM receives file content as text (no extraction/conversion)
- For PDF/DOCX: would need to convert to text before sending to LLM

**Conclusion:** Backend does NOT parse files. Files are:

1. Stored as-is in the backend
2. Passed to LLM as text content (via `read_file` tool or message content)

### Multimodal Message Support

**LangChain Core supports:**

- `ContentBlock.Text` - text content
- `ContentBlock.Image` - images (URL, base64, file ID)
- `ContentBlock.File` - generic files (URL, base64, file ID)
- `ContentBlock.Audio` / `ContentBlock.Video`

**Claude API supports:**

- Images (PNG, JPEG, GIF, WebP)
- Documents (PDF via `document` content block)
- Text files

### Delivery Markers Analysis

**Finding:** No explicit "delivery" marker found in backend infrastructure.

**LangGraph end detection:**

- Graph ends at `__end__` node (line 130 in useChat.ts: `goto: "__end__"`)
- `useStream` provides `onFinish` callback when stream completes
- Final state includes `files`, `messages`, `todos`

**Recommendation:** Define delivery detection via:

1. **Files created in final steps** - files added just before graph ends
2. **Explicit agent message** - agent signals delivery in final AI message
3. **Custom state field** - add `deliveries: FileItem[]` to state schema

---

## Frontend (LangChain/LangGraph SDK) ✅ SUPPORTED

The LangChain core library already supports multimodal content blocks:

```typescript
// MessageContent can be string or array of ContentBlocks
type MessageContent = string | Array<ContentBlock>;

// Supported content block types:
ContentBlock.Text; // { type: "text", text: string }
ContentBlock.Image; // { type: "image", url?: string, data?: string, mimeType?: string }
ContentBlock.Video; // { type: "video", url?: string, data?: string, mimeType?: string }
ContentBlock.Audio; // { type: "audio", url?: string, data?: string, mimeType?: string }
ContentBlock.File; // { type: "file", url?: string, data?: string, mimeType?: string }
ContentBlock.PlainText; // { type: "text-plain", text?: string, title?: string, context?: string }
```

**Data sources supported:**

- **URL**: `{ type: "image", url: "https://..." }`
- **Base64**: `{ type: "image", data: "base64...", mimeType: "image/png" }`
- **File ID**: `{ type: "image", fileId: "file-123" }`

**Current state structure:**

```typescript
type StateType = {
  messages: Message[];              // ✅ Supports ContentBlock[]
  todos: TodoItem[];
  files: Record<string, string>;    // Agent-created files (path → content)
  email?: { ... };
  ui?: any;
};
```

### Existing UI Components ✅ AVAILABLE

| Component          | Status          | Notes                             |
| ------------------ | --------------- | --------------------------------- |
| `FileViewDialog`   | ✅ Available    | Modal file viewer (60vw × 80vh)   |
| `InlineFileViewer` | ✅ Available    | Inline viewer in ContextPanel     |
| `ContextPanel`     | ✅ Available    | Right sidebar with Files tab      |
| `ChatMessage`      | ⚠️ Needs update | Currently only renders text       |
| `MarkdownContent`  | ✅ Available    | Renders markdown with code blocks |

---

## Feature-by-Feature Analysis

### 1. File Upload in User Input

**Frontend Changes Needed:**

- [ ] Add file upload button/area in input panel
- [ ] Handle file selection and conversion to base64
- [ ] Store uploaded files in local state
- [ ] Display uploaded file preview chips

**Backend Requirements:**

- [ ] LLM provider must accept multimodal input (Claude ✅ supports images/documents)
- [ ] deepagents must pass file blocks through to LLM
- [ ] Optional: File storage service for large files

**Current State:**

- LangGraph SDK: ✅ Supports multimodal messages
- deepagents: ❓ Unknown - needs verification
- Claude API: ✅ Supports images, PDFs, documents

**Implementation Complexity: MEDIUM**

### 2. File Sharing Functionality

**Definition Clarification Needed:**

- Option A: Share agent-created files with user (download)
- Option B: Share files between threads/users
- Option C: Generate shareable links

**Current State:**

- Agent files are in `files: Record<string, string>`
- No sharing/export UI exists

**Implementation Complexity: LOW-MEDIUM** (depends on definition)

### 3. File Reference in Chat

**Frontend Changes Needed:**

- [ ] Add `@file` mention syntax or file picker
- [ ] Render file reference chips in message input
- [ ] Display file blocks in ChatMessage component
- [ ] Show file preview cards inline

**Backend Requirements:**

- [ ] None - files are already in state

**Implementation Complexity: MEDIUM**

### 4. Delivery Document Preview Card

**Definition:**
When the agent completes a task and creates deliverable files, show preview cards in the chat.

**Challenges:**

- How to detect "delivery" vs "intermediate file"?
- Options:
  1. Explicit `deliver` tool call from agent
  2. Files created in final step
  3. Files matching certain patterns (e.g., `output/`, `deliverables/`)

**Frontend Changes Needed:**

- [ ] Create `DeliveryCard` component
- [ ] Detect delivery files from agent messages
- [ ] Render cards at end of AI message

**Backend Requirements:**

- [ ] Agent should signal when delivering files
- [ ] Or add metadata to distinguish delivery files

**Implementation Complexity: MEDIUM**

### 5. Click Card to Open File Viewer

**Current State:**

- ✅ `FileViewDialog` exists
- ✅ `InlineFileViewer` exists
- ✅ `ContextPanel` Files tab has click-to-view

**Frontend Changes Needed:**

- [ ] Wire delivery cards to trigger file viewer
- [ ] Wire file reference chips to trigger file viewer

**Implementation Complexity: LOW**

---

## Backend Gap Analysis

### What deepagents Needs to Support

| Feature                  | Current Status | Required                   |
| ------------------------ | -------------- | -------------------------- |
| Multimodal message input | ❓ Unknown     | ✅ Required                |
| File content in messages | ❓ Unknown     | ✅ Required                |
| Pass files to Claude     | ❓ Unknown     | ✅ Required                |
| Store uploaded files     | ❌ Not present | ⚠️ Optional (base64 works) |
| Delivery signal/metadata | ❌ Not present | ⚠️ Optional (UI can infer) |

### Claude API Capabilities

Claude supports the following file types in messages:

- **Images**: PNG, JPEG, GIF, WebP
- **Documents**: PDF (via `document` content block)
- **Text**: Plain text files

---

## Recommended Implementation Approach

### Phase 1: User File Upload (MVP)

```
┌─────────────────────────────────────────────────┐
│ [📎 Upload] [Type message...]            [Send] │
└─────────────────────────────────────────────────┘
        ↓ User uploads file
┌─────────────────────────────────────────────────┐
│ 📎 report.pdf [×]                               │
│ [Type message...]                        [Send] │
└─────────────────────────────────────────────────┘
```

**Implementation:**

1. Add upload button to input area
2. Convert file to base64
3. Include in message as `ContentBlock.File`
4. Display file chip above input

**Files to modify:**

- `src/app/components/ChatInterface.tsx` - add upload UI
- `src/app/hooks/useChat.ts` - handle file in sendMessage
- `src/app/components/ChatMessage.tsx` - render file blocks

### Phase 2: File Reference & Preview

```
┌─────────────────────────────────────────────────┐
│ User: Please analyze this file @report.pdf      │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ 📄 report.pdf                               │ │
│ │ PDF · 245 KB · Click to view                │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Phase 3: Delivery Preview Cards

```
┌─────────────────────────────────────────────────┐
│ Agent: I've completed the analysis. Here are    │
│ the deliverables:                               │
│                                                 │
│ ┌─────────────────┐ ┌─────────────────┐        │
│ │ 📄 summary.md   │ │ 📊 data.csv     │        │
│ │ Markdown · 2KB  │ │ CSV · 5KB       │        │
│ │ [View] [Copy]   │ │ [View] [Copy]   │        │
│ └─────────────────┘ └─────────────────┘        │
└─────────────────────────────────────────────────┘
```

---

## Questions for Clarification

1. **File Upload Scope:**

   - Should we support all file types or specific ones (images, PDFs, code)?
   - Maximum file size limit?

2. **File Sharing:**

   - What does "sharing" mean in this context?
   - Is it downloading agent-created files?
   - Is it sharing between users/threads?

3. **Delivery Detection:**

   - Should the agent explicitly signal delivery?
   - Or should UI detect based on file patterns?

4. **File Storage:**
   - Store in LangGraph state (base64)?
   - Use external file storage service?

---

## Conclusion

| Feature            | Backend Ready    | Frontend Ready | Effort | Notes                                                |
| ------------------ | ---------------- | -------------- | ------ | ---------------------------------------------------- |
| File upload        | ✅ Yes           | ⚠️ Partial     | Medium | Backend has upload_files API; need UI + state wiring |
| File sharing (URL) | ✅ Yes           | ❌ Needs UI    | Low    | Use file path as shareable identifier                |
| File reference     | ✅ Yes           | ❌ Needs UI    | Medium | ContentBlock.File already supported                  |
| Delivery cards     | ⚠️ Agent markers | ❌ Needs UI    | Medium | Need to define/parse delivery markers                |
| Click to view      | ✅ Yes           | ✅ Yes         | Low    | FileViewDialog already exists                        |

### Key Findings

1. **Backend supports file upload** via `upload_files()` API in multiple backends
2. **StateBackend (default)** returns "not supported yet" for file uploads - may need FilesystemBackend or StoreBackend
3. **Multimodal messages** are fully supported by LangChain core
4. **Delivery markers** not found in backend - likely in agent prompts or need to be defined

### Implementation Path

1. **Phase 1**: Add file upload UI + state management (frontend)
2. **Phase 2**: Wire uploads to backend `upload_files()` API
3. **Phase 3**: Add file reference chips in messages
4. **Phase 4**: Implement delivery card detection + rendering
5. **Phase 5**: Add shareable URL generation
