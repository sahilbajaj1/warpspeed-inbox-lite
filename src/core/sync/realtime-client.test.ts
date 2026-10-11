import { createRealtimeClient } from '@/core/sync/realtime-client';

type Handler = (...args: unknown[]) => void;

type FakeSocket = {
  connected: boolean;
  auth: { token?: string };
  on: jest.Mock;
  connect: jest.Mock;
  disconnect: jest.Mock;
  removeAllListeners: jest.Mock;
  emitLocal: (event: string, payload?: unknown) => void;
};

function createFakeSocket(): FakeSocket {
  const handlers = new Map<string, Handler[]>();
  const socket: FakeSocket = {
    connected: false,
    auth: {},
    on: jest.fn((event: string, handler: Handler) => {
      const list = handlers.get(event) ?? [];
      list.push(handler);
      handlers.set(event, list);
      return socket;
    }),
    connect: jest.fn(() => {
      socket.connected = true;
      for (const handler of handlers.get('connect') ?? []) {
        handler();
      }
    }),
    disconnect: jest.fn(() => {
      socket.connected = false;
    }),
    removeAllListeners: jest.fn(() => {
      handlers.clear();
    }),
    emitLocal(event: string, payload?: unknown) {
      for (const handler of handlers.get(event) ?? []) {
        handler(payload);
      }
    },
  };
  return socket;
}

describe('createRealtimeClient', () => {
  it('connects with access token auth and path /socket.io', async () => {
    const fake = createFakeSocket();
    const createSocket = jest.fn(() => fake as never);
    const onThreadEvent = jest.fn();

    const client = createRealtimeClient({
      socketUrl: 'https://sandbox3.staging.iamwarpspeed.com',
      getAccessToken: async () => 'access_123',
      refreshAccessToken: async () => true,
      onThreadEvent,
      createSocket,
    });

    await client.start();

    expect(createSocket).toHaveBeenCalledWith(
      'https://sandbox3.staging.iamwarpspeed.com',
      expect.objectContaining({
        path: '/socket.io',
        auth: { token: 'access_123' },
      }),
    );
    expect(fake.connect).toHaveBeenCalled();
  });

  it('forwards upserted/deleted events', async () => {
    const fake = createFakeSocket();
    const onThreadEvent = jest.fn();
    const client = createRealtimeClient({
      getAccessToken: async () => 'tok',
      refreshAccessToken: async () => true,
      onThreadEvent,
      createSocket: () => fake as never,
    });

    await client.start();

    fake.emitLocal('thread.upserted', {
      thread: {
        id: 'thr_1',
        subject: 'Hi',
        participants: [{ email: 'a@b.com' }],
        snippet: 'x',
        lastMessageAt: '2026-10-05T09:00:00Z',
        messageCount: 1,
        isRead: false,
        isStarred: false,
        isArchived: false,
        version: 1,
      },
      syncToken: 's1',
    });
    fake.emitLocal('thread.deleted', { id: 'thr_1', version: 2, syncToken: 's2' });

    expect(onThreadEvent).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'upsert', syncToken: 's1' }),
    );
    expect(onThreadEvent).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'delete', id: 'thr_1', version: 2 }),
    );
  });

  it('refreshes and reconnects on unauthorized', async () => {
    const fake = createFakeSocket();
    const refreshAccessToken = jest.fn(async () => true);
    const getAccessToken = jest
      .fn()
      .mockResolvedValueOnce('old')
      .mockResolvedValueOnce('new');

    const client = createRealtimeClient({
      getAccessToken,
      refreshAccessToken,
      onThreadEvent: jest.fn(),
      createSocket: () => fake as never,
    });

    await client.start();
    fake.emitLocal('unauthorized', { code: 'token_expired' });
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });

    expect(refreshAccessToken).toHaveBeenCalled();
    expect(fake.auth).toEqual({ token: 'new' });
    expect(fake.disconnect).toHaveBeenCalled();
    expect(fake.connect).toHaveBeenCalledTimes(2);
  });
});
