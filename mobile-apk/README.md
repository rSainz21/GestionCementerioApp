# APK instalable (wrapper) para la PWA `/movil`

Este directorio genera un **APK instalable** usando **Capacitor** (WebView propio).  
No depende de TWA/Chrome: es una app Android que muestra la PWA.

## Requisitos (en tu PC)

- Node.js 18+ (recomendado 20)
- Android Studio + SDK Android (incluye `adb`)
- Java (Android Studio ya lo trae normalmente)

## Configurar la URL de la PWA

Edita `mobile-apk/capacitor.config.ts` y cambia:

- `server.url` (por defecto apunta a `http://192.168.100.69:8000/movil`)

Si tu backend está en HTTP (sin HTTPS), se permite con `cleartext: true`.

## Generar el proyecto Android (1ª vez)

Desde la raíz del repo:

```bash
cd mobile-apk
npm install
npx cap add android
```

## Construir APK (debug)

```bash
cd mobile-apk
npm run cap:build:apk:debug
```

El APK se genera en:

`mobile-apk/android/app/build/outputs/apk/debug/app-debug.apk`

## Instalar en un teléfono por USB

Activa "Opciones de desarrollador" + "Depuración USB", y luego:

```bash
cd mobile-apk
npm run cap:run:android
```

## Notas

- Si cambias la URL, ejecuta `npm run cap:sync` antes de volver a compilar.
- Para distribuir a usuarios finales, lo habitual es firmar y generar release (APK/AAB).

