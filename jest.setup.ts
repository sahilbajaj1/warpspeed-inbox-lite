jest.mock('@shopify/flash-list', () => {
  const { FlatList } = require('react-native') as typeof import('react-native');
  return { FlashList: FlatList };
});

jest.mock('react-native-webview', () => {
  const React = require('react') as typeof import('react');
  const { View } = require('react-native') as typeof import('react-native');
  return {
    WebView: (props: Record<string, unknown>) =>
      React.createElement(View, { testID: 'webview-mock', ...props }),
  };
});

jest.mock('expo-router', () => {
  const React = require('react') as typeof import('react');
  return {
    Stack: Object.assign(
      ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, null, children),
      { Screen: () => null },
    ),
    Redirect: ({ href }: { href: string }) =>
      React.createElement('Redirect', { testID: 'redirect', href }),
    useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
    useLocalSearchParams: () => ({}),
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

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(async () => {
    throw new Error('sqlite unavailable in jest');
  }),
}));

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    connected: false,
    auth: {},
    on: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    removeAllListeners: jest.fn(),
  })),
}));

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
  const { __resetDatabaseRuntimeForTests } = require('@/core/database/database-runtime') as {
    __resetDatabaseRuntimeForTests: () => void;
  };
  __resetDatabaseRuntimeForTests();

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { __resetAuthRuntimeForTests } = require('@/core/auth/auth-runtime') as {
    __resetAuthRuntimeForTests: () => void;
  };
  __resetAuthRuntimeForTests();

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { __resetThreadActionQueueForTests } = require('@/features/inbox/actions/action-queue-runtime') as {
    __resetThreadActionQueueForTests: () => void;
  };
  __resetThreadActionQueueForTests();

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { __resetSyncRuntimeForTests } = require('@/core/sync/sync-runtime') as {
    __resetSyncRuntimeForTests: () => void;
  };
  __resetSyncRuntimeForTests();

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { __resetCreditsStoreForTests } = require('@/features/credits/credits-store') as {
    __resetCreditsStoreForTests: () => void;
  };
  __resetCreditsStoreForTests();
});
