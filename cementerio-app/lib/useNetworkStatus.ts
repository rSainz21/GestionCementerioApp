import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

import { ensureNetInfoConfiguredForWeb } from '@/lib/netinfo-web-config';

/**
 * Hook reactivo para estado de conectividad de red.
 * Devuelve `true` si hay conexión, `false` si no, `null` mientras se determina.
 */
export function useNetworkStatus(): { isConnected: boolean | null; isInternetReachable: boolean | null } {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(null);

  useEffect(() => {
    ensureNetInfoConfiguredForWeb();
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected);
      setIsInternetReachable(state.isInternetReachable ?? state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  return { isConnected, isInternetReachable };
}
