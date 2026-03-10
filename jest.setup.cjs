/**
 * Jest Test Setup
 * 配置全局 mocks 和测试环境
 */

require("@testing-library/jest-dom");

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  get length() {
    return 0;
  },
  key: jest.fn(),
};

Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
});

// Mock window.location
const locationMock = {
  href: "http://localhost:3000",
  origin: "http://localhost:3000",
  pathname: "/",
  search: "",
  hash: "",
  host: "localhost:3000",
  hostname: "localhost",
  port: "3000",
  protocol: "http:",
};

Object.defineProperty(global, "location", {
  value: locationMock,
  writable: true,
});

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock window.fetch
global.fetch = jest.fn();

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

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
