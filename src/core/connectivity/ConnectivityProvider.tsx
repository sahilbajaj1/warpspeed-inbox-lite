import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { logger } from '@/core/logging/logger';

export type ConnectivitySnapshot = {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: NetInfoState['type'];
};

const defaultSnapshot: ConnectivitySnapshot = {
  isConnected: true,
  isInternetReachable: null,
  type: 'unknown' as NetInfoState['type'],
};

const ConnectivityContext = createContext<ConnectivitySnapshot>(defaultSnapshot);

function mapState(state: NetInfoState): ConnectivitySnapshot {
  return {
    isConnected: state.isConnected ?? false,
    isInternetReachable: state.isInternetReachable,
    type: state.type,
  };
}

export function ConnectivityProvider({ children }: PropsWithChildren) {
  const [snapshot, setSnapshot] = useState<ConnectivitySnapshot>(defaultSnapshot);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const next = mapState(state);
      setSnapshot(next);
      logger.debug('network state changed', next);
    });

    void NetInfo.fetch().then((state) => {
      setSnapshot(mapState(state));
    });

    return unsubscribe;
  }, []);

  const value = useMemo(() => snapshot, [snapshot]);

  return (
    <ConnectivityContext.Provider value={value}>{children}</ConnectivityContext.Provider>
  );
}

export function useConnectivity(): ConnectivitySnapshot {
  return useContext(ConnectivityContext);
}
