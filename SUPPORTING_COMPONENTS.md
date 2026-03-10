# Supporting Components Documentation

## Overview

This document provides comprehensive documentation for the supporting UI components developed for the Deep Agents Studio frontend. All components are production-ready, fully typed with TypeScript, and WCAG 2.1 AA accessible.

## Component Inventory

### 1. WelcomeScreen

**Location**: `src/app/components/WelcomeScreen.tsx`

A welcoming landing screen for new users with animated introduction, quick action buttons, and assistant information.

#### Features

- Animated floating logo with scale-in effect
- Smooth slide-in animations for content sections
- Quick action grid (4 common actions)
- Assistant connection status display
- Responsive grid layout
- Footer with external links

#### Props

```typescript
interface WelcomeScreenProps {
  /**
   * Callback when user clicks "Get Started"
   */
  onGetStarted: () => void;

  /**
   * Assistant ID to display (optional)
   */
  assistantId?: string;

  /**
   * Show loading state (disables button)
   */
  isLoading?: boolean;
}
```

#### Usage

```tsx
import { WelcomeScreen } from "@/app/components/WelcomeScreen";

<WelcomeScreen
  onGetStarted={() => handleStart()}
  assistantId="my-agent-123"
  isLoading={isConnecting}
/>;
```

#### Accessibility

- WCAG 2.1 AA compliant
- Proper heading hierarchy (H1)
- Semantic HTML structure
- Accessible external links (rel="noopener noreferrer")
- Color contrast >= 4.5:1 for text

---

### 2. ThemeToggle

**Location**: `src/app/components/ThemeToggle.tsx`

Light/dark/system theme switcher with localStorage persistence.

#### Features

- Three theme options: Light, Dark, System (respects OS preference)
- localStorage persistence
- Dropdown menu with visual feedback
- Icon changes based on theme
- Smooth transitions
- Respects prefers-color-scheme media query

#### Props

```typescript
interface ThemeToggleProps {
  /**
   * Callback when theme changes
   */
  onThemeChange?: (theme: "light" | "dark" | "system") => void;

  /**
   * Display variant: 'icon' (compact) or 'full' (with text)
   */
  variant?: "icon" | "full";

  /**
   * Show label text
   */
  showLabel?: boolean;
}
```

#### Usage

```tsx
import { ThemeToggle } from "@/app/components/ThemeToggle";

<ThemeToggle
  variant="icon"
  onThemeChange={(theme) => {
    console.log("Theme changed to:", theme);
  }}
/>;
```

#### Accessibility

- WCAG 2.1 AA compliant
- Keyboard navigation support
- Proper ARIA labels
- Accessible dropdown menu
- Color + icon for status clarity
- Screen reader support

---

### 3. StatusIndicator

**Location**: `src/app/components/StatusIndicator.tsx`

Visual status indicator with multiple states, animations, and tooltips.

#### Features

- 5 status states: connected, connecting, disconnected, error, idle
- Animated pulsing/spinning indicators
- Optional tooltips with descriptions
- Multiple size variants (sm, md, lg)
- Color-coded status display
- Custom labels

#### Props

```typescript
interface StatusIndicatorProps {
  /**
   * Current status: 'connected' | 'connecting' | 'disconnected' | 'error' | 'idle'
   */
  status: Status;

  /**
   * Optional label text
   */
  label?: string;

  /**
   * Optional description (shows in tooltip)
   */
  description?: string;

  /**
   * Enable pulsing animation
   */
  pulse?: boolean;

  /**
   * Size variant: 'sm' | 'md' | 'lg'
   */
  size?: "sm" | "md" | "lg";

  /**
   * Show label beside indicator
   */
  showLabel?: boolean;
}
```

#### Usage

```tsx
import { StatusIndicator } from "@/app/components/StatusIndicator";

<StatusIndicator
  status="connected"
  label="Agent"
  description="Connection established"
  size="md"
  showLabel
/>;
```

#### Accessibility

- WCAG 2.1 AA compliant
- Color + icon for status clarity (not color-dependent)
- Proper ARIA roles (role="status")
- Accessible tooltips with keyboard support
- Clear status descriptions

---

### 4. LoadingSpinner

**Location**: `src/app/components/LoadingSpinner.tsx`

Flexible loading state indicator with multiple variants and optional text.

#### Features

- 4 animation variants: spinner, dots, pulse, skeleton
- Multiple size options (sm, md, lg, xl)
- Optional label text
- Full-screen overlay mode
- Custom colors
- Reduced motion support

#### Props

```typescript
interface LoadingSpinnerProps {
  /**
   * Visual variant: 'spinner' | 'dots' | 'pulse' | 'skeleton'
   */
  variant?: Variant;

  /**
   * Size: 'sm' | 'md' | 'lg' | 'xl'
   */
  size?: Size;

  /**
   * Label text
   */
  label?: string;

  /**
   * Show label
   */
  showLabel?: boolean;

  /**
   * Custom color
   */
  color?: string;

  /**
   * Full screen overlay
   */
  fullScreen?: boolean;

  /**
   * Overlay opacity (0-1)
   */
  overlayOpacity?: number;

  /**
   * Centered layout
   */
  centered?: boolean;
}
```

#### SkeletonLoader Sub-component

```typescript
interface SkeletonLoaderProps {
  count?: number; // Number of lines (default: 3)
  height?: string; // Height class (default: 'h-4')
  width?: string; // Width class (default: 'w-full')
  gap?: string; // Gap class (default: 'gap-2')
  rounded?: string; // Border radius (default: 'rounded-md')
}
```

#### Usage

```tsx
import { LoadingSpinner, SkeletonLoader } from '@/app/components/LoadingSpinner';

// Regular spinner
<LoadingSpinner
  variant="spinner"
  size="lg"
  label="Loading..."
  showLabel
/>

// Full screen overlay
<LoadingSpinner
  variant="spinner"
  fullScreen
  overlayOpacity={0.7}
  label="Processing"
  showLabel
/>

// Skeleton placeholder
<SkeletonLoader count={5} height="h-8" gap="gap-3" />
```

#### Accessibility

- WCAG 2.1 AA compliant
- Proper role="status"
- Screen reader announcements
- Semantic HTML
- Respects prefers-reduced-motion

---

### 5. ErrorBoundary

**Location**: `src/app/components/ErrorBoundary.tsx`

Error boundary for graceful error handling with recovery options.

#### Features

- Catches React errors in child components
- Customizable fallback UI
- Development mode with stack traces
- Production mode with error IDs
- Error recovery mechanisms
- Multiple severity levels (page, section, inline)
- Error logging support
- Accessibility-first design

#### Props

```typescript
interface ErrorBoundaryProps {
  /**
   * Child components
   */
  children: ReactNode;

  /**
   * Custom fallback UI
   */
  fallback?: ReactElement;

  /**
   * Error callback
   */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;

  /**
   * Keys to trigger reset
   */
  resetKeys?: Array<string | number>;

  /**
   * Auto-reset on props change
   */
  resetOnPropsChange?: boolean;

  /**
   * Error severity level
   */
  level?: "page" | "section" | "inline";
}
```

#### useErrorHandler Hook

```typescript
// Manually throw errors in functional components
const handleError = useErrorHandler();

try {
  // some operation
} catch (error) {
  handleError(error);
}
```

#### Usage

```tsx
import { ErrorBoundary, useErrorHandler } from '@/app/components/ErrorBoundary';

// Page-level error boundary
<ErrorBoundary level="page" onError={logError}>
  <YourApp />
</ErrorBoundary>

// Section-level error boundary
<ErrorBoundary level="section">
  <ComplexComponent />
</ErrorBoundary>

// With reset keys
<ErrorBoundary resetKeys={[userId, threadId]}>
  <ThreadView />
</ErrorBoundary>

// With error handler hook
function MyComponent() {
  const handleError = useErrorHandler();

  const handleClick = async () => {
    try {
      await riskyOperation();
    } catch (error) {
      handleError(error);
    }
  };
}
```

#### Accessibility

- WCAG 2.1 AA compliant
- Proper role="alert"
- aria-live="assertive"
- aria-atomic="true"
- Accessible buttons and links
- Keyboard navigation support
- Clear error messaging

---

### 6. OPDCAStageDisplay

**Location**: `src/app/components/OPDCAStageDisplay.tsx`

Displays OPDCA (Observe-Plan-Do-Check-Adapt) workflow stage with visual indicators.

#### Features

- 6 workflow stages: observe, plan, do, check, adapt, idle
- 3 display variants: minimal, compact, full
- Progress indicators
- Color-coded stages
- Stage descriptions
- Progress bar visualization

#### Props

```typescript
interface OPDCAStageDisplayProps {
  /**
   * Current stage
   */
  stage: "observe" | "plan" | "do" | "check" | "adapt" | "idle";

  /**
   * Display variant: 'minimal' | 'compact' | 'full'
   */
  variant?: "full" | "compact" | "minimal";

  /**
   * Show stage description
   */
  showDescription?: boolean;

  /**
   * Custom class names
   */
  className?: string;
}
```

#### OPDCATimeline Sub-component

```typescript
interface OPDCATimelineProps {
  /**
   * Current stage
   */
  currentStage: OPDCAStage;

  /**
   * Completed stages
   */
  completedStages?: OPDCAStage[];

  /**
   * Show labels
   */
  showLabels?: boolean;

  /**
   * Compact layout
   */
  compact?: boolean;
}
```

#### Usage

```tsx
import {
  OPDCAStageDisplay,
  OPDCATimeline,
} from '@/app/components/OPDCAStageDisplay';

// Display current stage
<OPDCAStageDisplay
  stage="plan"
  variant="full"
  showDescription
/>

// Show workflow timeline
<OPDCATimeline
  currentStage="do"
  completedStages={['observe', 'plan']}
  showLabels
/>

// Minimal inline indicator
<OPDCAStageDisplay stage="plan" variant="minimal" />
```

#### Accessibility

- WCAG 2.1 AA compliant
- Proper role="status"
- Color + icon + text for clarity
- Semantic HTML headings
- ARIA labels for timeline
- Screen reader announcements

---

## Integration Examples

### Example 1: Chat Interface with Welcome Screen

```tsx
import { WelcomeScreen } from "@/app/components/WelcomeScreen";
import { ChatInterface } from "@/app/components/ChatInterface";

export function ChatPage() {
  const [threadId, setThreadId] = useQueryState("threadId");
  const [assistantId] = useQueryState("assistantId");

  return threadId ? (
    <ChatInterface assistantId={assistantId} />
  ) : (
    <WelcomeScreen
      assistantId={assistantId}
      onGetStarted={() => {
        // Create new thread or start chat
      }}
    />
  );
}
```

### Example 2: Header with Theme and Status

```tsx
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { StatusIndicator } from "@/app/components/StatusIndicator";

export function Header({ agentConnected }) {
  return (
    <header className="flex items-center justify-between">
      <h1>Deep Agents Studio</h1>
      <div className="flex gap-4">
        <StatusIndicator
          status={agentConnected ? "connected" : "disconnected"}
          label="Agent"
          showLabel
        />
        <ThemeToggle variant="icon" />
      </div>
    </header>
  );
}
```

### Example 3: Protected Route with Error Boundary

```tsx
import { ErrorBoundary } from "@/app/components/ErrorBoundary";

export function ProtectedPage() {
  return (
    <ErrorBoundary
      level="page"
      onError={logError}
    >
      <PageContent />
    </ErrorBoundary>
  );
}
```

### Example 4: Workflow Display

```tsx
import {
  OPDCAStageDisplay,
  OPDCATimeline,
} from "@/app/components/OPDCAStageDisplay";

export function WorkflowIndicator({ currentStage, completedStages }) {
  return (
    <div className="space-y-4">
      <OPDCATimeline
        currentStage={currentStage}
        completedStages={completedStages}
        showLabels
      />
      <OPDCAStageDisplay
        stage={currentStage}
        variant="compact"
        showDescription
      />
    </div>
  );
}
```

---

## Styling and Customization

### TailwindCSS Integration

All components use TailwindCSS with proper class sorting via `prettier-plugin-tailwindcss`.

### Dark Mode Support

All components automatically adapt to light/dark mode using the `dark:` prefix.

### Custom Theme Colors

To customize component colors, modify the Tailwind configuration:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: "#your-color",
        // ... other colors
      },
    },
  },
};
```

---

## Testing

Each component includes comprehensive test suites covering:

- Rendering and display
- User interactions
- Accessibility (WCAG 2.1 AA)
- Edge cases
- Error scenarios
- Integration scenarios

### Running Tests

```bash
npm test                          # Run all tests
npm test -- --watch             # Watch mode
npm test -- --coverage          # Coverage report
npm test WelcomeScreen          # Specific component
```

---

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Mobile)

---

## Performance Considerations

### Code Splitting

Components use React.memo for optimization and can be code-split:

```tsx
const WelcomeScreen = lazy(() =>
  import("@/app/components/WelcomeScreen").then((mod) => ({
    default: mod.WelcomeScreen,
  }))
);
```

### Bundle Sizes (Gzipped)

- WelcomeScreen: ~3KB
- ThemeToggle: ~2KB
- StatusIndicator: ~2KB
- LoadingSpinner: ~1.5KB
- ErrorBoundary: ~2.5KB
- OPDCAStageDisplay: ~3KB

---

## Accessibility Checklist

- [x] WCAG 2.1 Level AA compliance
- [x] Keyboard navigation support
- [x] Screen reader compatibility
- [x] Color contrast >= 4.5:1
- [x] Focus indicators
- [x] Semantic HTML
- [x] ARIA labels/roles
- [x] Reduced motion support

---

## Migration from Existing Components

### From old WelcomeScreen HTML

```tsx
// Old
<div className="welcome-screen">
  <h1>Welcome</h1>
  {/* ... */}
</div>

// New
<WelcomeScreen onGetStarted={handleStart} />
```

### From manual theme switching

```tsx
// Old
const toggleTheme = () => {
  // Manual localStorage and DOM manipulation
};

// New
<ThemeToggle onThemeChange={handleThemeChange} />;
```

---

## Troubleshooting

### WelcomeScreen not animating

- Ensure component is fully mounted
- Check that CSS-in-JS styles are applied
- Verify prefers-reduced-motion is not set

### ThemeToggle not persisting

- Clear browser localStorage
- Check localStorage permissions
- Verify no CSP restrictions

### StatusIndicator tooltip not showing

- Ensure TooltipProvider wraps the component
- Check description prop is set
- Verify z-index is not being overridden

### LoadingSpinner fullScreen overlay blocking clicks

- Set pointer-events: none on overlay if needed
- Adjust z-index values
- Use section-level instead of fullScreen

### ErrorBoundary not catching errors

- Only catches render-time errors (not async)
- Use try-catch for event handlers
- Use useErrorHandler hook for thrown errors

---

## Contributing

When adding new components:

1. Create component file in `src/app/components/`
2. Add comprehensive JSDoc comments
3. Include full test suite in `__tests__/`
4. Update this documentation
5. Ensure WCAG 2.1 AA compliance
6. Run linter and formatter

---

## Version History

**v1.0.0** (2026-03-09)

- Initial release
- All 6 supporting components
- Complete test coverage
- WCAG 2.1 AA compliance
- Full TypeScript support

---

## License

Same as parent project (Deep Agents UI)

---

## Support

For issues or questions:

1. Check component documentation
2. Review test files for usage examples
3. Check accessibility guidelines
4. Open GitHub issue with minimal reproduction
