// Jest Test Setup

require("@testing-library/jest-dom");

// Mock next/navigation
jest.mock("next/navigation", () => {
  return {
    __esModule: true,
    useRouter: jest.fn(() => ({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    })),
    usePathname: jest.fn(() => "/"),
    useSearchParams: jest.fn(() => new URLSearchParams()),
  };
});

// Mock nuqs
jest.mock("nuqs", () => ({
  useQueryState: jest.fn((key) => [null, jest.fn()]),
}));

// Mock @langchain/langgraph-sdk
jest.mock("@langchain/langgraph-sdk", () => ({
  __esModule: true,
}));

jest.mock("@langchain/langgraph-sdk/react", () => ({
  useStream: jest.fn(() => ({
    submit: jest.fn(),
    stop: jest.fn(),
    messages: [],
    values: { todos: [], files: {} },
    isLoading: false,
    isThreadLoading: false,
    interrupt: null,
    getMessagesMetadata: jest.fn(),
  })),
}));

// Mock @/providers/ClientProvider
jest.mock("@/providers/ClientProvider", () => ({
  useClient: jest.fn(() => ({
    threads: {
      updateState: jest.fn(),
    },
  })),
}));

// Jest runtime has an issue where assigning to location in some newer versions throws.
// Let's clear up that try/catch and use the built-in JSDOM setup config instead of
// modifying global in jest.setup.js

// Mock fetch globally
global.fetch = jest.fn();

// Silence console errors/warnings in tests (optional)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Warning: ReactDOM.render is no longer supported")
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
