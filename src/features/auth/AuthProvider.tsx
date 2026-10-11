import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type PropsWithChildren,
} from 'react';

import { getSessionManager } from '@/core/auth/auth-runtime';
import type { SessionStatus } from '@/core/auth/session-manager';
import { isApiError, toUserMessage } from '@/core/api/errors';
import type { LoginCredentials } from '@/features/auth/api/auth-api';

export type AuthContextValue = {
  status: SessionStatus;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const sessionManager = useMemo(() => getSessionManager(), []);

  const status = useSyncExternalStore(
    (onStoreChange) => sessionManager.subscribe(onStoreChange),
    () => sessionManager.getSnapshot().status,
    (): SessionStatus => 'bootstrapping',
  );

  useEffect(() => {
    void sessionManager.bootstrap();
  }, [sessionManager]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      async login(credentials) {
        try {
          await sessionManager.login({
            email: credentials.email.trim(),
            password: credentials.password,
          });
        } catch (error) {
          if (isApiError(error) && error.category === 'unauthorized') {
            throw new Error('Invalid email or password.');
          }
          if (isApiError(error)) {
            throw new Error(toUserMessage(error));
          }
          throw new Error('Unable to sign in. Please try again.');
        }
      },
      async logout() {
        await sessionManager.logout();
      },
    }),
    [sessionManager, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
