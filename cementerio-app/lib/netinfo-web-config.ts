import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';

let configuredInBrowser = false;

/**
 * En web, @react-native-community/netinfo usa por defecto HEAD a `/` y espera 200.
 * Con Expo dev server `/` suele ser 404 → spam en consola y `isInternetReachable` erróneo.
 * Usamos un recurso estático del propio origen (normalmente 200), p. ej. `/favicon.ico`.
 *
 * Importante: en SSR puede ejecutarse sin `window`; no marcar como configurado hasta el navegador.
 */
export function ensureNetInfoConfiguredForWeb() {
  if (Platform.OS !== 'web') return;
  if (typeof window === 'undefined' || !window.location?.origin) return;
  if (configuredInBrowser) return;

  configuredInBrowser = true;

  NetInfo.configure({
    reachabilityUrl: `${window.location.origin}/favicon.ico`,
    reachabilityMethod: 'HEAD',
    reachabilityHeaders: {},
    reachabilityTest: async (response) => response.status === 200,
    reachabilityShortTimeout: 5 * 1000,
    reachabilityLongTimeout: 60 * 1000,
    reachabilityRequestTimeout: 15 * 1000,
    useNativeReachability: false,
  });
}
