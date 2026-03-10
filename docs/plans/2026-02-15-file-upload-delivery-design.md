# File Upload & Delivery Features Design

> Date: 2026-02-15
> Version: 2.0
> Status: Design Approved

## Overview

This document outlines the design for file upload, sharing, referencing, and delivery preview features in deep-agents-ui v2.

## Core Features

### 1. File Upload in User Input

**Supported File Types:**

- Images: PNG, JPEG, GIF, WebP
- Documents: TXT, MD, PDF, DOCX, CSV (passed directly to LLM, no parsing)

**UI Design:**

```
┌─────────────────────────────────────────────────────────────────┐
│ [📎] [Type message...]                                    [Send] │
└─────────────────────────────────────────────────────────────────┘
```

After file selection:

```
┌─────────────────────────────────────────────────────────────────┐
│ ┌──────────────┐                                                │
│ │ 📄 report.pdf [×]                                           │
│ └──────────────┘                                                │
│ [📎] [Type message...]                                    [Send] │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation:**

- Add upload button (📎 icon) to input toolbar
- Convert files to base64
- Use LangChain multimodal content blocks:
  ```typescript
  // Images
  { type: "image_url", image_url: { url: "data:image/png;base64,..." } }
  // Documents
  { type: "file", data: "base64...", mimeType: "application/pdf" }
  ```
- Display file preview chips above textarea
- Support multiple file selection

### 2. File Sharing (URL)

**Design:**
Each file has a shareable URL that users can copy.

```
┌─────────────────────────────────────────────┐
│ 📄 analysis.md                         [📋] │
│ Markdown · 2.4 KB                           │
└─────────────────────────────────────────────┘
```

**Implementation:**

- File URL format: `{baseUrl}/threads/{threadId}/files/{filePath}`
- Copy button copies the URL to clipboard
- URL points to file content (can be viewed in browser or downloaded)

### 3. File Reference in Chat

**Design:**
When user references a file (via @file syntax or file picker), show a reference chip in the message.

```
┌─────────────────────────────────────────────────────────────────┐
│ User: Please analyze this report                                │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 📄 Q4_Report.pdf                                            │ │
│ │ PDF · 1.2 MB · Click to view                                │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation:**

- Add file picker dropdown in input
- Display file reference as clickable chip
- Clicking opens FileViewDialog

### 4. Agent Delivery Preview Cards

**Design:**
When agent completes a task and creates deliverable files, show delivery cards after the last AI message.

Reference: Manus-style delivery display

```
┌─────────────────────────────────────────────────────────────────┐
│ Agent: I've completed the analysis. Here are your files:        │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 📦 交付文件 (3)                                    [查看全部] │ │
│ │                                                             │ │
│ │ 📄 summary.md                    📊 data.csv                 │ │
│ │ 2 minutes ago                    1 minute ago               │ │
│ │                                                             │ │
│ │ ┌─────────────────────────────────────────────────────────┐ │ │
│ │ │ 📋 analysis_report.md                                   │ │ │
│ │ │ ─────────────────────────────────────────────────────── │ │ │
│ │ │ # Analysis Report                                       │ │ │
│ │ │                                                         │ │ │
│ │ │ ## Executive Summary                                    │ │ │
│ │ │ This report provides a comprehensive analysis...        │ │ │
│ │ │                                                         │ │ │
│ │ │ [查看完整文件]                                           │ │ │
│ │ └─────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**"查看全部" Interaction:**

- Clicking "查看全部" opens the **ContextPanel Files tab**
- Shows complete file list with sorting and management capabilities

**Display Rules:**

1. Show only when task completes (`isLoading === false`)
2. Display last 3 files created by agent
3. Last file gets a preview card with:
   - First 10-15 lines of content (for text files)
   - File icon and metadata for binary files
   - "查看完整文件" button to open FileViewDialog

**Detection Logic:**

```typescript
// Show delivery cards when:
// 1. isLoading transitions from true to false
// 2. Last message is AI message
// 3. Files were created during this session

const showDeliveryCards = useMemo(() => {
  if (isLoading) return false;
  const lastMsg = messages[messages.length - 1];
  return lastMsg?.type === "ai" && Object.keys(files).length > 0;
}, [isLoading, messages, files]);

// Get last 3 files (sorted by creation time)
const lastThreeFiles = useMemo(() => {
  const fileEntries = Object.entries(files);
  // Sort by metadata addedAt time, take last 3
  return fileEntries
    .sort((a, b) => {
      const metaA = fileMetadata.get(a[0]);
      const metaB = fileMetadata.get(b[0]);
      return (metaB?.addedAt || 0) - (metaA?.addedAt || 0);
    })
    .slice(0, 3);
}, [files, fileMetadata]);
```

### 5. Click to Open File Viewer

**Design:**

- Existing `FileViewDialog` component is reused
- All file preview cards and chips are clickable
- Opens modal viewer (60vw × 80vh)

## Component Architecture

```
src/app/components/
├── ChatInterface.tsx          # Add file upload button
├── ChatMessage.tsx            # Add file reference chips + delivery cards
├── DeliveryCard.tsx           # NEW: Delivery preview container
├── FilePreviewCard.tsx        # NEW: Individual file preview card
├── FileUploadZone.tsx         # NEW: File upload input component
├── FileChip.tsx               # NEW: File reference chip
└── FileViewDialog.tsx         # EXISTING: Modal file viewer
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Input                              │
│  ┌─────────────┐                                                │
│  │ Upload File │ ──> Convert to base64 ──> ContentBlock         │
│  └─────────────┘                                                │
│  ┌─────────────┐                                                │
│  │ Reference   │ ──> File picker ──> FileChip                   │
│  └─────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      useChat Hook                               │
│  sendMessage(content: string, files?: ContentBlock[])          │
│                              │                                  │
│  stream.values.files ◄───────┼─────── Agent-created files       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ChatMessage                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ AI Message content                                          ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ DeliveryCard (if showDeliveryCards)                         ││
│  │   ├── File list (last 3)                                    ││
│  │   └── Preview card (last file)                              ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: File Upload in Input

1. Create `FileUploadZone.tsx` component
2. Add upload button to `ChatInterface.tsx`
3. Convert files to base64
4. Display file chips above textarea
5. Update `useChat.ts` to handle multimodal messages

### Phase 2: File Sharing URL

1. Generate shareable URLs for files
2. Add copy button to file chips
3. Implement copy-to-clipboard functionality

### Phase 3: File Reference in Chat

1. Create `FileChip.tsx` component
2. Add file picker in input area
3. Render file references in messages
4. Wire click to FileViewDialog

### Phase 4: Delivery Preview Cards

1. Create `DeliveryCard.tsx` component
2. Create `FilePreviewCard.tsx` component
3. Detect task completion in ChatMessage
4. Render last 3 files with preview card
5. Wire "查看全部" to ContextPanel Files tab
6. Wire preview card to FileViewDialog

## Backend Integration Notes

### Existing Backend Support

- `upload_files()` API exists in BackendProtocol
- `FilesystemBackend`, `StoreBackend`, `CompositeBackend` support file uploads
- `StateBackend` (default) returns "not supported yet" for uploads

### Multimodal Message Format

```typescript
// LangChain content block format
type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "file"; data?: string; url?: string; mimeType?: string };
```

### Delivery Detection

- LangGraph signals completion via `isLoading === false`
- Files in `stream.values.files` are agent-created deliverables
- No explicit "delivery" marker needed - UI infers from state

## Questions Resolved

1. **File types**: Support what backend supports (images, txt, pdf, md, docs, csv)
2. **Sharing**: Provide copyable URL
3. **Delivery detection**: UI detects from `isLoading` state and file presence
4. **"查看全部" interaction**: Opens ContextPanel Files tab
