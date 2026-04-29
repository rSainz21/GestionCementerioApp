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
      infoPlist: {
        ...(config.ios as any)?.infoPlist,
        NSCameraUsageDescription: 'Necesitamos acceso a la cámara para adjuntar fotos a los expedientes.',
        NSPhotoLibraryUsageDescription: 'Necesitamos acceso a tus fotos para adjuntar imágenes existentes a los expedientes.',
        NSLocationWhenInUseUsageDescription: 'Necesitamos tu ubicación para registrar coordenadas GPS en auditorías de campo.',
        NSSpeechRecognitionUsageDescription: 'Necesitamos reconocimiento de voz para dictar notas de auditoría.',
        NSMicrophoneUsageDescription: 'Necesitamos el micrófono para el dictado de notas.',
      },
    },
    android: {
      ...(config.android ?? {}),
      package: (config.android as any)?.package ?? 'com.lcdbsaas.cementerioapp',
      permissions: [
        'CAMERA',
        'READ_MEDIA_IMAGES',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'RECORD_AUDIO',
      ],
    },
    extra: {
      ...(config.extra ?? {}),
    },
  };
};

