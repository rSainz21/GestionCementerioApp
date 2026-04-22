import 'dotenv/config';
import type { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config,
    name: config.name ?? 'cementerio-app',
    slug: config.slug ?? 'cementerio-app',
    ios: {
      ...(config.ios ?? {}),
      supportsTablet: true,
      bundleIdentifier: config.ios?.bundleIdentifier ?? 'com.lcdbsaas.cementerioapp',
    },
    android: {
      ...(config.android ?? {}),
      package: (config.android as any)?.package ?? 'com.lcdbsaas.cementerioapp',
    },
    extra: {
      ...(config.extra ?? {}),
    },
  };
};

