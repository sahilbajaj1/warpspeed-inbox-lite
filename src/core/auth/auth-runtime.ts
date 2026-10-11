import { apiClient, bindApiTokenProvider } from '@/core/api/api-singleton';
import { createSessionManager, type SessionManager } from '@/core/auth/session-manager';
import { createSecureTokenStorage } from '@/core/auth/token-storage';
import { logger } from '@/core/logging/logger';
import { createAuthApi } from '@/features/auth/api/auth-api';

let sessionManager: SessionManager | null = null;

/**
 * Placeholder for Phase 8/9 cleanup (SQLite, sockets, outbox processors).
 * Auth clears tokens here; feature modules register additional teardown later.
 */
function clearUserScopedRuntimeState(): void {
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
