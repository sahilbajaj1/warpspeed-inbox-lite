jest.mock('expo-router', () => {
  const React = require('react') as typeof import('react');
  return {
    Stack: Object.assign(
      ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, null, children),
      { Screen: () => null },
    ),
    Redirect: ({ href }: { href: string }) =>
      React.createElement('Redirect', { testID: 'redirect', href }),
    useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  };
});

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() =>
    Promise.resolve({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    }),
  ),
}));

jest.mock('expo-secure-store', () => {
  const memory = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => memory.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      memory.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      memory.delete(key);
    }),
    __memory: memory,
  };
});

jest.mock('@/core/logging/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const secureStore = require('expo-secure-store') as { __memory: Map<string, string> };
  secureStore.__memory.clear();

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { __resetAuthRuntimeForTests } = require('@/core/auth/auth-runtime') as {
    __resetAuthRuntimeForTests: () => void;
  };
  __resetAuthRuntimeForTests();
});
