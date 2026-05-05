import type { CapacitorConfig } from '@capacitor/cli';

/**
 * APK "de siempre" (WebView propio) que abre la PWA /movil.
 *
 * IMPORTANTE:
 * - Para que funcione fuera de tu Wi‑Fi, necesitas una URL accesible (ideal: HTTPS).
 * - Cambia MOVIL_URL si tu servidor/IP cambia.
 */
const MOVIL_URL =
  process.env.MOVIL_URL ??
  // servidor del compañero (LAN) por defecto:
  'http://192.168.100.69:8000/movil';

const config: CapacitorConfig = {
  appId: 'com.somahoz.cementerio',
  appName: 'Cementerio Somahoz',
  webDir: 'www',
  server: {
    url: MOVIL_URL,
    cleartext: true
  },
  android: {
    allowMixedContent: true
  }
};

export default config;

