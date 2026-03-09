/**
 * Unit Tests for ChatMessage Component
 * Tests: Rendering, message types, content display
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatMessage from '../ChatMessage';

// Mock dependencies
jest.mock('../BubbleMarkdown', () => {
  return function MockBubbleMarkdown({ content }: { content: string }) {
    return <div data-testid="markdown-content">{content}</div>;
  };
});

jest.mock('../ToolCallBox', () => {
  return function MockToolCallBox({ toolCall }: any) {
    return <div data-testid="tool-call-box">{toolCall.name}</div>;
  };
});

jest.mock('../SubAgentIndicator', () => {
  return function MockSubAgentIndicator({ message }: any) {
    return <div data-testid="sub-agent-indicator">SubAgent</div>;
  };
});

describe('ChatMessage', () => {
  const baseMessage = {
    id: '1',
    type: 'human' as const,
    content: 'Test message',
  };

  it('should render human message', () => {
    render(<ChatMessage message={baseMessage} />);
    expect(screen.getByTestId('markdown-content')).toBeInTheDocument();
  });

  it('should render assistant message', () => {
    const assistantMessage = {
      ...baseMessage,
      type: 'ai' as const,
    };
    render(<ChatMessage message={assistantMessage} />);
    expect(screen.getByTestId('markdown-content')).toBeInTheDocument();
  });

  it('should display message content correctly', () => {
    const messageContent = 'This is a test message';
    render(
      <ChatMessage
        message={{
          ...baseMessage,
          content: messageContent,
        }}
      />
    );
    expect(screen.getByText(messageContent)).toBeInTheDocument();
  });

  it('should render tool calls when present', () => {
    const messageWithTools = {
      ...baseMessage,
      type: 'ai' as const,
      content: [
        {
          type: 'tool_use' as const,
          id: 'tool-1',
          name: 'test_tool',
          input: { arg1: 'value1' },
        },
      ],
    };

    render(<ChatMessage message={messageWithTools} />);
    expect(screen.getByTestId('tool-call-box')).toBeInTheDocument();
  });

  it('should render SubAgentIndicator for sub-agent messages', () => {
    const subAgentMessage = {
      ...baseMessage,
      type: 'ai' as const,
      content: 'Sub-agent response',
      metadata: {
        subAgent: 'research_agent',
      },
    };

    render(<ChatMessage message={subAgentMessage} />);
    // SubAgentIndicator should be rendered
    expect(screen.queryByTestId('sub-agent-indicator')).toBeInTheDocument();
  });

  it('should handle empty message content', () => {
    const emptyMessage = {
      ...baseMessage,
      content: '',
    };

    render(<ChatMessage message={emptyMessage} />);
    expect(screen.getByTestId('markdown-content')).toBeInTheDocument();
  });

  it('should handle message with multiple content blocks', () => {
    const complexMessage = {
      ...baseMessage,
      type: 'ai' as const,
      content: [
        'Text content',
        {
          type: 'tool_use' as const,
          id: 'tool-1',
          name: 'search',
          input: { query: 'test' },
        },
      ],
    };

    render(<ChatMessage message={complexMessage} />);
    // Should render both text and tool
    expect(screen.getByTestId('markdown-content')).toBeInTheDocument();
    expect(screen.getByTestId('tool-call-box')).toBeInTheDocument();
  });
});
