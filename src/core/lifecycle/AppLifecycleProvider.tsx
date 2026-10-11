import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { logger } from '@/core/logging/logger';

export type AppLifecycleSnapshot = {
  appState: AppStateStatus;
  isActive: boolean;
};

const defaultSnapshot: AppLifecycleSnapshot = {
  appState: AppState.currentState,
  isActive: AppState.currentState === 'active',
};

const AppLifecycleContext = createContext<AppLifecycleSnapshot>(defaultSnapshot);

export function AppLifecycleProvider({ children }: PropsWithChildren) {
  const [snapshot, setSnapshot] = useState<AppLifecycleSnapshot>(defaultSnapshot);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const next: AppLifecycleSnapshot = {
        appState: nextState,
        isActive: nextState === 'active',
      };
      setSnapshot(next);
      logger.debug('app lifecycle changed', next);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const value = useMemo(() => snapshot, [snapshot]);

  return (
    <AppLifecycleContext.Provider value={value}>{children}</AppLifecycleContext.Provider>
  );
}

export function useAppLifecycle(): AppLifecycleSnapshot {
  return useContext(AppLifecycleContext);
}
