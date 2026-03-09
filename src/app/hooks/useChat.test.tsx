/**
 * useChat 单元测试
 * 测试错误处理逻辑
 */

import { renderHook, act } from '@testing-library/react';
import { useChat } from '@/app/hooks/useChat';
import { useStream } from '@langchain/langgraph-sdk/react';
import { useClient } from '@/providers/ClientProvider';
import { useQueryState } from 'nuqs';

// Mock dependencies
jest.mock('@langchain/langgraph-sdk/react');
jest.mock('@/providers/ClientProvider');
jest.mock('nuqs');
jest.mock('@/app/types/types', () => ({
  TodoItem: {},
}));

const mockUseStream = useStream as jest.MockedFunction<typeof useStream>;
const mockUseClient = useClient as jest.MockedFunction<typeof useClient>;
const mockUseQueryState = useQueryState as jest.MockedFunction<typeof useQueryState>;

describe('useChat - Error Handling', () => {
  const mockOnHistoryRevalidate = jest.fn();

  const mockStreamReturn = {
    submit: jest.fn(),
    stop: jest.fn(),
    messages: [],
    values: {
      todos: [],
      files: {},
    },
    isLoading: false,
    isThreadLoading: false,
    interrupt: null,
    getMessagesMetadata: jest.fn(),
  };

  const mockClient = {
    threads: {
      updateState: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockUseStream.mockReturnValue(mockStreamReturn as any);
    mockUseClient.mockReturnValue(mockClient as any);
    mockUseQueryState.mockReturnValue([null, jest.fn()] as any);
  });

  describe('handleStreamError - 认证错误分类', () => {
    test('应识别 401 错误', () => {
      const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

      // Create a hook instance to access handleStreamError
      const { result } = renderHook(() =>
        useChat({
          activeAssistant: null,
          onHistoryRevalidate: mockOnHistoryRevalidate,
        })
      );

      // Call handleStreamError with 401 error
      const error = new Error('Request failed with status code 401');
      act(() => {
        // Access the error handler through the stream's onError callback
        mockStreamReturn.onError?.(error);
      });

      // Should log as debug (handled by AuthContext)
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        '[useChat] 认证错误（由 AuthContext 处理）:',
        expect.stringContaining('401')
      );

      // Should still revalidate history
      expect(mockOnHistoryRevalidate).toHaveBeenCalled();

      consoleDebugSpy.mockRestore();
    });

    test('应识别 403 错误', () => {
      const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

      renderHook(() =>
        useChat({
          activeAssistant: null,
          onHistoryRevalidate: mockOnHistoryRevalidate,
        })
      );

      const error = new Error('Request failed with status code 403');
      act(() => {
        mockStreamReturn.onError?.(error);
      });

      expect(consoleDebugSpy).toHaveBeenCalledWith(
        '[useChat] 认证错误（由 AuthContext 处理）:',
        expect.stringContaining('403')
      );

      consoleDebugSpy.mockRestore();
    });

    test('应识别 unauthorized 关键字错误', () => {
      const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

      renderHook(() =>
        useChat({
          activeAssistant: null,
          onHistoryRevalidate: mockOnHistoryRevalidate,
        })
      );

      const error = new Error('Unauthorized access');
      act(() => {
        mockStreamReturn.onError?.(error);
      });

      expect(consoleDebugSpy).toHaveBeenCalledWith(
        '[useChat] 认证错误（由 AuthContext 处理）:',
        'Unauthorized access'
      );

      consoleDebugSpy.mockRestore();
    });

    test('应识别 forbidden 关键字错误', () => {
      const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

      renderHook(() =>
        useChat({
          activeAssistant: null,
          onHistoryRevalidate: mockOnHistoryRevalidate,
        })
      );

      const error = new Error('Access forbidden');
      act(() => {
        mockStreamReturn.onError?.(error);
      });

      expect(consoleDebugSpy).toHaveBeenCalledWith(
        '[useChat] 认证错误（由 AuthContext 处理）:',
        'Access forbidden'
      );

      consoleDebugSpy.mockRestore();
    });
  });

  describe('handleStreamError - 网络错误分类', () => {
    test('应识别 Failed to fetch 错误', () => {
      const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

      renderHook(() =>
        useChat({
          activeAssistant: null,
          onHistoryRevalidate: mockOnHistoryRevalidate,
        })
      );

      const error = new Error('Failed to fetch');
      act(() => {
        mockStreamReturn.onError?.(error);
      });

      expect(consoleDebugSpy).toHaveBeenCalledWith(
        '[useChat] 网络错误（将自动重连）:',
        'Failed to fetch'
      );

      consoleDebugSpy.mockRestore();
    });

    test('应识别 network error 错误', () => {
      const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

      renderHook(() =>
        useChat({
          activeAssistant: null,
          onHistoryRevalidate: mockOnHistoryRevalidate,
        })
      );

      const error = new Error('Network error occurred');
      act(() => {
        mockStreamReturn.onError?.(error);
      });

      expect(consoleDebugSpy).toHaveBeenCalledWith(
        '[useChat] 网络错误（将自动重连）:',
        'Network error occurred'
      );

      consoleDebugSpy.mockRestore();
    });

    test('应识别 abort 错误', () => {
      const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

      renderHook(() =>
        useChat({
          activeAssistant: null,
          onHistoryRevalidate: mockOnHistoryRevalidate,
        })
      );

      const error = new Error('The operation was aborted');
      act(() => {
        mockStreamReturn.onError?.(error);
      });

      expect(consoleDebugSpy).toHaveBeenCalledWith(
        '[useChat] 网络错误（将自动重连）:',
        'The operation was aborted'
      );

      consoleDebugSpy.mockRestore();
    });

    test('应识别 timeout 错误', () => {
      const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

      renderHook(() =>
        useChat({
          activeAssistant: null,
          onHistoryRevalidate: mockOnHistoryRevalidate,
        })
      );

      const error = new Error('Request timed out');
      act(() => {
        mockStreamReturn.onError?.(error);
      });

      expect(consoleDebugSpy).toHaveBeenCalledWith(
        '[useChat] 网络错误（将自动重连）:',
        'Request timed out'
      );

      consoleDebugSpy.mockRestore();
    });

    test('应识别 ECONNREFUSED 错误', () => {
      const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

      renderHook(() =>
        useChat({
          activeAssistant: null,
          onHistoryRevalidate: mockOnHistoryRevalidate,
        })
      );

      const error = new Error('ECONNREFUSED: Connection refused');
      act(() => {
        mockStreamReturn.onError?.(error);
      });

      expect(consoleDebugSpy).toHaveBeenCalledWith(
        '[useChat] 网络错误（将自动重连）:',
        'ECONNREFUSED: Connection refused'
      );

      consoleDebugSpy.mockRestore();
    });

    test('应识别 ERR_CONNECTION 错误', () => {
      const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

      renderHook(() =>
        useChat({
          activeAssistant: null,
          onHistoryRevalidate: mockOnHistoryRevalidate,
        })
      );

      const error = new Error('ERR_CONNECTION_RESET');
      act(() => {
        mockStreamReturn.onError?.(error);
      });

      expect(consoleDebugSpy).toHaveBeenCalledWith(
        '[useChat] 网络错误（将自动重连）:',
        'ERR_CONNECTION_RESET'
      );

      consoleDebugSpy.mockRestore();
    });
  });

  describe('handleStreamError - 服务端 BlockingError 分类', () => {
    test('应识别 BlockingError', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      renderHook(() =>
        useChat({
          activeAssistant: null,
          onHistoryRevalidate: mockOnHistoryRevalidate,
        })
      );

      const error = new Error('BlockingError: Synchronous I/O operation');
      act(() => {
        mockStreamReturn.onError?.(error);
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[useChat] 服务端内部错误（BlockingError），请检查后端日志:',
        'BlockingError: Synchronous I/O operation'
      );

      consoleWarnSpy.mockRestore();
    });

    test('应识别 internal error occurred', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      renderHook(() =>
        useChat({
          activeAssistant: null,
          onHistoryRevalidate: mockOnHistoryRevalidate,
        })
      );

      const error = new Error('An internal error occurred');
      act(() => {
        mockStreamReturn.onError?.(error);
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[useChat] 服务端内部错误（BlockingError），请检查后端日志:',
        'An internal error occurred'
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('handleStreamError - 未知错误分类', () => {
    test('未知错误应使用 console.error', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      renderHook(() =>
        useChat({
          activeAssistant: null,
          onHistoryRevalidate: mockOnHistoryRevalidate,
        })
      );

      const error = new Error('Some unknown error');
      act(() => {
        mockStreamReturn.onError?.(error);
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[useChat] Stream 错误:',
        error
      );

      consoleErrorSpy.mockRestore();
    });

    test('非 Error 对象应转换为字符串', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      renderHook(() =>
        useChat({
          activeAssistant: null,
          onHistoryRevalidate: mockOnHistoryRevalidate,
        })
      );

      act(() => {
        mockStreamReturn.onError?.('String error');
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[useChat] Stream 错误:',
        'String error'
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('handleStreamError - 通用行为', () => {
    test('所有错误都应触发历史记录重新验证', () => {
      const errorTypes = [
        new Error('401 error'),
        new Error('Network error'),
        new Error('BlockingError'),
        new Error('Unknown error'),
      ];

      for (const error of errorTypes) {
        jest.clearAllMocks();
        mockOnHistoryRevalidate.mockClear();

        renderHook(() =>
          useChat({
            activeAssistant: null,
            onHistoryRevalidate: mockOnHistoryRevalidate,
          })
        );

        act(() => {
          mockStreamReturn.onError?.(error);
        });

        expect(mockOnHistoryRevalidate).toHaveBeenCalled();
      }
    });
  });

  describe('错误分类优先级', () => {
    test('认证错误应优先于网络错误', () => {
      const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

      renderHook(() =>
        useChat({
          activeAssistant: null,
          onHistoryRevalidate: mockOnHistoryRevalidate,
        })
      );

      // 401 同时也包含 "failed" 关键字，但认证错误应该优先
      const error = new Error('401 failed to authenticate');
      act(() => {
        mockStreamReturn.onError?.(error);
      });

      expect(consoleDebugSpy).toHaveBeenCalledWith(
        '[useChat] 认证错误（由 AuthContext 处理）:',
        expect.any(String)
      );

      consoleDebugSpy.mockRestore();
    });
  });
});
