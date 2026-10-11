import { apiClient, bindApiTokenProvider } from '@/core/api/api-singleton';
import { createSessionManager, type SessionManager } from '@/core/auth/session-manager';
import { createSecureTokenStorage } from '@/core/auth/token-storage';
import { clearPersistedUserData } from '@/core/database/database-runtime';
import { logger } from '@/core/logging/logger';
import { appQueryClient } from '@/core/query/query-client';
import { createAuthApi } from '@/features/auth/api/auth-api';
import { resetThreadActionQueue } from '@/features/inbox/actions/action-queue-runtime';

let sessionManager: SessionManager | null = null;

/**
 * Drop user-scoped Query cache, SQLite outbox/thread cache, and action queue.
 */
async function clearUserScopedRuntimeState(): Promise<void> {
  appQueryClient.clear();
  await clearPersistedUserData();
  resetThreadActionQueue();
  logger.info('cleared user-scoped runtime state after session end');
}

function bindSession(manager: SessionManager): void {
  sessionManager = manager;
  bindApiTokenProvider({
    getAccessToken: () => manager.getAccessToken(),
    refreshAccessToken: () => manager.refreshAccessToken(),
  });
}

export function getSessionManager(): SessionManager {
  if (!sessionManager) {
    const authApi = createAuthApi(apiClient);
    bindSession(
      createSessionManager({
        authApi,
        tokenStorage: createSecureTokenStorage(),
        onSessionCleared: clearUserScopedRuntimeState,
      }),
    );
  }

  return sessionManager!;
}

/** Test-only: replace or clear the process-wide session singleton. */
export function __resetAuthRuntimeForTests(manager?: SessionManager): void {
  if (manager) {
    bindSession(manager);
    return;
  }
  sessionManager = null;
  bindApiTokenProvider({
    getAccessToken: async () => null,
    refreshAccessToken: async () => false,
  });
}
