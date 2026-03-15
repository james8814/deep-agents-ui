# Day 3 Enhancement Implementation Guide

**Date**: March 9, 2026
**Version**: 1.0.0
**Status**: Production-Ready ✅

## Overview

This document provides complete guidance for integrating Day 3 enhancements into the AZUNE UI. These enhancements improve user experience, accessibility, and system visibility through expanded input features, risk indicators, and better message handling.

## Table of Contents

1. [Components Overview](#components-overview)
2. [Implementation Steps](#implementation-steps)
3. [Testing Strategy](#testing-strategy)
4. [Accessibility Compliance](#accessibility-compliance)
5. [Migration Path](#migration-path)
6. [Performance Considerations](#performance-considerations)
7. [Troubleshooting](#troubleshooting)

---

## Components Overview

### 1. InputArea Component (`InputArea.tsx`)

**Purpose**: Enhanced input component with expand/collapse, execution time tracking, and send status indicators.

**Key Features**:

- Input expand/collapse button with state management
- Automatic textarea height adjustment (1-8 lines)
- Character count display (>500 chars)
- Execution time display with formatting (ms/s/m format)
- Send status indicator (idle, sending, error)
- Keyboard shortcuts (Cmd/Ctrl+Enter, Shift+Enter)
- Full WCAG 2.1 AA accessibility
- Upload zone integration
- Focus state styling

**Props**:

```typescript
interface InputAreaProps {
  input: string;
  onInputChange: (value: string) => void;
  attachedFiles: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  onSubmit: (e?: FormEvent) => void;
  onStop: () => void;
  isLoading: boolean;
  isDisabled: boolean;
  onUploadClick: () => void;
  uploadInputRef: React.RefObject<HTMLInputElement>;
  executionTime?: number | null;
  sendStatus?: "idle" | "sending" | "error";
  inputExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  minHeight?: number;
  maxHeight?: number;
  autoMaxHeight?: number;
  lineHeight?: number;
  paddingY?: number;
}
```

**Usage**:

```typescript
import { InputArea } from "@/app/components/InputArea";

export function ChatInterface() {
  const [input, setInput] = useState("");
  const [inputExpanded, setInputExpanded] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);

  return (
    <InputArea
      input={input}
      onInputChange={setInput}
      attachedFiles={[]}
      onFilesChange={() => {}}
      onSubmit={handleSubmit}
      onStop={handleStop}
      isLoading={isLoading}
      isDisabled={!!interrupt}
      onUploadClick={triggerUpload}
      uploadInputRef={uploadInputRef}
      executionTime={executionTime}
      sendStatus="idle"
      inputExpanded={inputExpanded}
      onExpandedChange={setInputExpanded}
    />
  );
}
```

---

### 2. ToolCallBoxEnhanced Component (`ToolCallBoxEnhanced.tsx`)

**Purpose**: Enhanced tool call display with risk badges, execution time, and copy functionality.

**Key Features**:

- Risk level badges (low/medium/high/critical)
- Tool-specific risk assessment
- Execution time display
- Copy arguments to clipboard
- Automatic expansion for interrupted tools
- Color-coded risk levels
- Full accessibility support

**Risk Level System**:

```typescript
const TOOL_RISK_MAP: Record<string, RiskBadgeConfig> = {
  read_file: { level: "low", label: "Read-only" },
  write_file: {
    level: "high",
    label: "Write Risk",
    description: "Modifies files",
  },
  delete_file: {
    level: "critical",
    label: "Delete Risk",
    description: "Removes files",
  },
  execute_command: {
    level: "critical",
    label: "Execute Risk",
    description: "Runs system commands",
  },
  // ... more tools
};
```

**Color Coding**:

- **Critical** (Red): `bg-red-100 text-red-800`
- **High** (Orange): `bg-orange-100 text-orange-800`
- **Medium** (Yellow): `bg-yellow-100 text-yellow-800`
- **Low** (Green): `bg-green-100 text-green-800`

**Usage**:

```typescript
import { ToolCallBoxEnhanced } from "@/app/components/ToolCallBoxEnhanced";

<ToolCallBoxEnhanced
  toolCall={toolCall}
  uiComponent={uiComponent}
  stream={stream}
  graphId={graphId}
  actionRequest={actionRequest}
  onResume={handleResume}
  isLoading={isLoading}
  riskLevel="high"
  executionTime={1250}
  showCopyButton={true}
/>;
```

---

### 3. MessageListEnhanced Component (`MessageListEnhanced.tsx`)

**Purpose**: Enhanced message list with code block copy buttons and collapsible long messages.

**Key Features**:

- Code block copy functionality
- Language badge display
- Filename preservation
- Collapsible messages (>20 lines)
- Smooth expand/collapse animations
- Copy feedback animation
- Full accessibility support

**Code Block Component**:

```typescript
interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
}

<CodeBlock
  code={code}
  language="typescript"
  filename="index.ts"
/>;
```

**Collapsible Message Component**:

```typescript
interface CollapsibleMessageProps {
  content: string;
  maxLines?: number; // default: 20
}

<CollapsibleMessage
  content={longText}
  maxLines={20}
/>;
```

**Usage**:

```typescript
import { MessageListEnhanced } from "@/app/components/MessageListEnhanced";

<MessageListEnhanced
  messages={messages}
  isLoading={isLoading}
  onEditAndResend={handleEditAndResend}
/>;
```

---

## Implementation Steps

### Step 1: Replace ChatInterface Input Area

**File**: `src/app/components/ChatInterface.tsx`

```typescript
// Before: Inline textarea implementation
<textarea
  ref={textareaRef}
  value={input}
  onChange={(e) => setInput(e.target.value)}
  {...otherProps}
/>;

// After: Use InputArea component
import { InputArea } from "@/app/components/InputArea";

<InputArea
  input={input}
  onInputChange={setInput}
  attachedFiles={attachedFiles}
  onFilesChange={setAttachedFiles}
  onSubmit={handleSubmit}
  onStop={stopStream}
  isLoading={isLoading}
  isDisabled={!!interrupt}
  onUploadClick={triggerUpload}
  uploadInputRef={uploadInputRef}
  inputExpanded={isExpanded}
  onExpandedChange={setIsExpanded}
/>;
```

### Step 2: Replace ToolCallBox with Enhanced Version

**File**: `src/app/components/ChatMessage.tsx`

```typescript
// Before:
import { ToolCallBox } from "@/app/components/ToolCallBox";

// After:
import { ToolCallBoxEnhanced } from "@/app/components/ToolCallBoxEnhanced";

{
  toolCalls.map((toolCall) => (
    <ToolCallBoxEnhanced
      key={toolCall.id}
      toolCall={toolCall}
      uiComponent={uiComponent}
      stream={stream}
      graphId={graphId}
      actionRequest={actionRequestsMap?.get(toolCall.name)}
      reviewConfig={reviewConfigsMap?.get(toolCall.name)}
      onResume={onResumeInterrupt}
      isLoading={isLoading && isStreaming}
      riskLevel={getRiskLevel(toolCall.name)}
      executionTime={getExecutionTime(toolCall)}
    />
  ));
}
```

### Step 3: Replace MessageList with Enhanced Version

**File**: `src/app/components/ChatMessage.tsx`

For long text content in AI messages:

```typescript
// Before:
<MarkdownContent content={messageContent} />;

// After: For messages > 500 chars
import { CollapsibleMessage } from "@/app/components/MessageListEnhanced";

{
  messageContent.length > 500 ? (
    <CollapsibleMessage
      content={messageContent}
      maxLines={20}
    />
  ) : (
    <MarkdownContent content={messageContent} />
  );
}
```

### Step 4: Add Execution Time Tracking

**File**: `src/app/components/ChatInterface.tsx`

```typescript
const [executionTime, setExecutionTime] = useState<number | null>(null);

// Track execution time
useEffect(() => {
  if (isLoading) {
    const startTime = Date.now();
    const interval = setInterval(() => {
      setExecutionTime(Date.now() - startTime);
    }, 100);
    return () => clearInterval(interval);
  } else {
    setExecutionTime(null);
  }
}, [isLoading]);

// Pass to InputArea
<InputArea
  {...props}
  executionTime={executionTime}
  sendStatus={stream.error ? "error" : isLoading ? "sending" : "idle"}
/>;
```

---

## Testing Strategy

### Unit Tests

All components include comprehensive test suites:

1. **InputArea.test.tsx** (28 tests)

   - Input functionality
   - Expand/collapse behavior
   - Submit handling
   - Keyboard navigation
   - Accessibility features

2. **ToolCallBoxEnhanced.test.tsx** (25 tests)
   - Risk badge display
   - Status indicators
   - Copy functionality
   - Expand/collapse
   - Accessibility

### Running Tests

```bash
# Run all tests
npm run test

# Run specific component tests
npm run test -- InputArea.test.tsx
npm run test -- ToolCallBoxEnhanced.test.tsx

# Run with coverage
npm run test -- --coverage

# Watch mode
npm run test -- --watch
```

### Test Coverage Goals

- **Statements**: 90%+
- **Branches**: 85%+
- **Functions**: 90%+
- **Lines**: 90%+

---

## Accessibility Compliance

### WCAG 2.1 AA Compliance

All components meet WCAG 2.1 AA standards:

#### InputArea

- ✅ Proper ARIA labels on all inputs
- ✅ aria-describedby for character count
- ✅ aria-busy for loading state
- ✅ aria-pressed for toggle buttons
- ✅ aria-expanded for expand controls
- ✅ Focus visible on all interactive elements
- ✅ Keyboard navigation (Tab, Enter, Cmd/Ctrl+Enter)
- ✅ Color contrast ratio >= 4.5:1
- ✅ Large touch targets (44x44px minimum)

#### ToolCallBoxEnhanced

- ✅ Semantic button elements
- ✅ aria-label on all buttons
- ✅ aria-expanded for expandable sections
- ✅ aria-controls linking button to content
- ✅ role="region" with aria-label
- ✅ Focus indicators with ring styling
- ✅ Hover states for all interactive elements
- ✅ Color and icons for risk indication (not color alone)

#### MessageListEnhanced

- ✅ Semantic heading hierarchy
- ✅ Code block language announcements
- ✅ Copy button labels
- ✅ Expandable section ARIA support
- ✅ Focus management on expand/collapse

### Screen Reader Testing

```bash
# Test with NVDA (Windows)
# Test with JAWS (Windows)
# Test with VoiceOver (macOS)
# Test with TalkBack (Android)
```

### Keyboard Navigation Testing

- Tab through all interactive elements
- Shift+Tab to reverse
- Enter to activate buttons
- Space to toggle checkboxes
- Escape to close modals
- Arrow keys for collapsible sections

---

## Migration Path

### Phase 1: Development & Testing (Week 1)

1. Implement all three components
2. Write comprehensive tests
3. Test with screen readers
4. Performance optimization

### Phase 2: Integration (Week 2)

1. Integrate InputArea into ChatInterface
2. Integrate ToolCallBoxEnhanced into ChatMessage
3. Integrate MessageListEnhanced for long messages
4. End-to-end testing

### Phase 3: Feature Flag Rollout (Week 3-4)

```typescript
// src/lib/featureFlags.ts
export const useEnhancedInputArea = useFeatureFlag("ENHANCED_INPUT_AREA");
export const useEnhancedToolCallBox = useFeatureFlag("ENHANCED_TOOL_CALL_BOX");
export const useEnhancedMessageList = useFeatureFlag("ENHANCED_MESSAGE_LIST");

// Usage in components
if (useEnhancedInputArea) {
  <InputArea {...props} />;
} else {
  <OldInputArea {...props} />;
}
```

### Phase 4: Monitoring & Optimization (Week 4+)

1. Monitor performance metrics
2. Gather user feedback
3. Optimize based on real usage
4. Deprecate old components after 2 weeks

---

## Performance Considerations

### Optimization Strategies

1. **Memoization**

   - All components wrapped with React.memo()
   - useMemo for expensive calculations
   - useCallback for event handlers

2. **Code Splitting**

   - Components can be lazily loaded
   - Risk assessment logic is cached
   - Time formatting is optimized

3. **Re-render Prevention**
   - Props are carefully structured to prevent cascade updates
   - Parent component handles state management
   - Child components are pure when possible

### Metrics

```typescript
// Measure rendering performance
const start = performance.now();
// component renders
const end = performance.now();
console.log(`InputArea render: ${end - start}ms`);
```

### Bundle Size Impact

- InputArea: ~8KB (minified + gzipped)
- ToolCallBoxEnhanced: ~6KB
- MessageListEnhanced: ~5KB
- **Total**: ~19KB additional

---

## Troubleshooting

### Common Issues

#### Issue 1: Textarea height not updating

**Solution**: Ensure `ref` is properly connected and dependency array includes `[input]`

```typescript
useEffect(() => {
  const textarea = textareaRef.current;
  if (textarea) {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  }
}, [input]); // Include all dependencies
```

#### Issue 2: Risk badge colors not showing

**Solution**: Ensure Tailwind CSS is configured for extended colors

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Verify color definitions are present
      },
    },
  },
};
```

#### Issue 3: Copy button not working

**Solution**: Check clipboard API is available

```typescript
if (navigator.clipboard) {
  await navigator.clipboard.writeText(text);
} else {
  // Fallback for older browsers
  fallbackCopyToClipboard(text);
}
```

#### Issue 4: Focus indicators not visible

**Solution**: Ensure focus-visible ring is not overridden

```css
/* Don't do this: */
* {
  outline: none;
}

/* Instead: */
.focus-visible\:ring-2 {
  @apply ring-2 ring-ring ring-offset-2;
}
```

### Debug Mode

Enable debug logging:

```typescript
// In component or via window.location.search
const DEBUG = new URLSearchParams(window.location.search).has("debug");

if (DEBUG) {
  console.log("InputArea state:", { input, isExpanded, executionTime });
}
```

---

## Analytics Integration

Track user interactions for improvement:

```typescript
// Track input expand
gtag("event", "input_expand_toggled", {
  expanded: newExpanded,
  input_length: input.length,
});

// Track copy actions
gtag("event", "code_block_copied", {
  language,
  code_length: code.length,
});

// Track tool call interactions
gtag("event", "tool_call_expanded", {
  tool_name: name,
  expanded: true,
});
```

---

## Future Enhancements

1. **Input Autocomplete**

   - History suggestions
   - Command palette integration

2. **Advanced Risk Assessment**

   - Context-aware risk levels
   - User confirmation for critical operations

3. **Code Block Enhancements**

   - Syntax highlighting
   - Diff view for file changes
   - Line number selection

4. **Message Features**
   - Reaction emojis
   - Message threading
   - Search highlighting

---

## Support & Contact

For questions or issues:

1. Check this guide's Troubleshooting section
2. Review component tests for usage examples
3. Open an issue on GitHub with:
   - Component name
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser/OS information

---

**Last Updated**: 2026-03-09
**Maintained By**: AZUNE Frontend Team
