import { io, type Socket } from 'socket.io-client';

import {
  socketBalanceUpdatedSchema,
  socketThreadDeletedSchema,
  socketThreadUpsertedSchema,
  socketUnauthorizedSchema,
} from '@/core/api/schemas';
import { appConfig } from '@/core/config/app-config';
import { logger } from '@/core/logging/logger';
import type { RealtimeThreadEvent } from '@/core/sync/types';

export type RealtimeClient = {
  start: () => Promise<void>;
  stop: () => void;
  isConnected: () => boolean;
};

export type RealtimeClientDeps = {
  socketUrl?: string;
  getAccessToken: () => Promise<string | null>;
  refreshAccessToken: () => Promise<boolean>;
  onThreadEvent: (event: RealtimeThreadEvent) => void | Promise<void>;
  onBalanceUpdated?: (balance: number) => void;
  /** Injected for tests */
  createSocket?: typeof io;
};

/**
 * Single authenticated Socket.IO client.
 * Reconnect sequence (with SyncEngine): connect → buffer → catch-up → drain.
 */
export function createRealtimeClient(deps: RealtimeClientDeps): RealtimeClient {
  const createSocket = deps.createSocket ?? io;
  let socket: Socket | null = null;
  let stopped = true;
  let reauthInFlight: Promise<void> | null = null;

  async function resolveToken(): Promise<string | null> {
    return deps.getAccessToken();
  }

  async function handleUnauthorized(reason: string): Promise<void> {
    if (reauthInFlight) {
      return reauthInFlight;
    }
    reauthInFlight = (async () => {
      logger.warn('socket unauthorized; attempting refresh', { reason });
      const refreshed = await deps.refreshAccessToken();
      if (!refreshed || stopped) {
        logger.warn('socket reauth failed; stopping realtime');
        stopInternal();
        return;
      }
      const token = await resolveToken();
      if (!token || !socket) {
        stopInternal();
        return;
      }
      socket.auth = { token };
      if (!socket.connected) {
        socket.connect();
      } else {
        socket.disconnect();
        socket.connect();
      }
    })().finally(() => {
      reauthInFlight = null;
    });
    return reauthInFlight;
  }

  function bindHandlers(active: Socket): void {
    active.on('connect', () => {
      logger.info('socket connected');
    });

    active.on('disconnect', (reason) => {
      logger.info('socket disconnected', { reason });
    });

    active.on('thread.upserted', (payload: unknown) => {
      const parsed = socketThreadUpsertedSchema.safeParse(payload);
      if (!parsed.success) {
        logger.warn('invalid thread.upserted payload');
        return;
      }
      void deps.onThreadEvent({
        kind: 'upsert',
        thread: parsed.data.thread,
        syncToken: parsed.data.syncToken,
      });
    });

    active.on('thread.deleted', (payload: unknown) => {
      const parsed = socketThreadDeletedSchema.safeParse(payload);
      if (!parsed.success) {
        logger.warn('invalid thread.deleted payload');
        return;
      }
      void deps.onThreadEvent({
        kind: 'delete',
        id: parsed.data.id,
        version: parsed.data.version,
        syncToken: parsed.data.syncToken,
      });
    });

    active.on('balance.updated', (payload: unknown) => {
      const parsed = socketBalanceUpdatedSchema.safeParse(payload);
      if (!parsed.success) {
        logger.warn('invalid balance.updated payload');
        return;
      }
      deps.onBalanceUpdated?.(parsed.data.userBalance);
    });

    active.on('unauthorized', (payload: unknown) => {
      const parsed = socketUnauthorizedSchema.safeParse(payload);
      const code = parsed.success ? parsed.data.code : undefined;
      void handleUnauthorized(code ?? 'unauthorized_event');
    });

    active.on('connect_error', (error: Error) => {
      const message = error?.message ?? '';
      if (message.toLowerCase().includes('unauthorized')) {
        void handleUnauthorized('connect_error');
        return;
      }
      logger.warn('socket connect_error', { message });
    });
  }

  function stopInternal(): void {
    stopped = true;
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    }
  }

  return {
    async start() {
      if (!stopped && socket) {
        return;
      }
      stopped = false;
      const token = await resolveToken();
      if (!token || stopped) {
        return;
      }
      socket = createSocket(deps.socketUrl ?? appConfig.socketUrl, {
        path: '/socket.io',
        auth: { token },
        autoConnect: false,
        transports: ['websocket', 'polling'],
        reconnection: true,
      });
      bindHandlers(socket);
      socket.connect();
    },

    stop() {
      stopInternal();
    },

    isConnected() {
      return Boolean(socket?.connected);
    },
  };
}
