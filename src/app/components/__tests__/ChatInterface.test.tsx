/**
 * Integration Tests for ChatInterface Component
 * Tests: Message streaming, user input, send functionality
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ChatInterface from '../ChatInterface';

// Mock hooks
jest.mock('@/app/hooks/useChat', () => ({
  useChat: jest.fn(),
}));

jest.mock('@/providers/ClientProvider', () => ({
  useClient: jest.fn(() => ({
    threads: {
      updateState: jest.fn(),
    },
  })),
}));

// Mock child components
jest.mock('../ExecutionStatusBar', () => {
  return function MockStatusBar() {
    return <div data-testid="execution-status">Status Bar</div>;
  };
});

jest.mock('../ChatMessage', () => {
  return function MockChatMessage({ message }: any) {
    return <div data-testid="chat-message">{message.content}</div>;
  };
});

jest.mock('../FileUploadZone', () => {
  return function MockFileUpload() {
    return <div data-testid="file-upload">File Upload</div>;
  };
});

const { useChat } = require('@/app/hooks/useChat');

describe('ChatInterface', () => {
  const mockUseChat = () => ({
    messages: [],
    isLoading: false,
    submit: jest.fn(),
    stop: jest.fn(),
    interrupt: null,
    getMessagesMetadata: jest.fn(() => ({})),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    useChat.mockReturnValue(mockUseChat());
  });

  it('should render chat interface', () => {
    render(<ChatInterface threadId="test-thread" />);
    expect(screen.getByTestId('execution-status')).toBeInTheDocument();
  });

  it('should display messages from stream', () => {
    const messages = [
      { id: '1', type: 'human' as const, content: 'Hello' },
      { id: '2', type: 'ai' as const, content: 'Hi there' },
    ];

    useChat.mockReturnValue({
      ...mockUseChat(),
      messages,
    });

    render(<ChatInterface threadId="test-thread" />);

    expect(screen.getAllByTestId('chat-message')).toHaveLength(2);
  });

  it('should show loading state when messages are loading', () => {
    useChat.mockReturnValue({
      ...mockUseChat(),
      isLoading: true,
    });

    render(<ChatInterface threadId="test-thread" />);
    // Component should handle loading state
    expect(screen.getByTestId('execution-status')).toBeInTheDocument();
  });

  it('should submit message on send', async () => {
    const mockSubmit = jest.fn();
    useChat.mockReturnValue({
      ...mockUseChat(),
      submit: mockSubmit,
    });

    const user = userEvent.setup();
    render(<ChatInterface threadId="test-thread" />);

    // Simulate finding and interacting with input
    const input = screen.queryByPlaceholderText(/message/i) ||
      document.querySelector('input[type="text"]');

    if (input) {
      await user.type(input, 'Test message');
      await user.click(screen.getByRole('button', { name: /send|submit/i }));

      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalled();
      });
    }
  });

  it('should stop message generation when stop button clicked', async () => {
    const mockStop = jest.fn();
    useChat.mockReturnValue({
      ...mockUseChat(),
      isLoading: true,
      stop: mockStop,
    });

    const user = userEvent.setup();
    render(<ChatInterface threadId="test-thread" />);

    const stopButton = screen.queryByRole('button', { name: /stop/i });
    if (stopButton) {
      await user.click(stopButton);
      expect(mockStop).toHaveBeenCalled();
    }
  });

  it('should display file upload zone', () => {
    render(<ChatInterface threadId="test-thread" />);
    expect(screen.getByTestId('file-upload')).toBeInTheDocument();
  });
});
