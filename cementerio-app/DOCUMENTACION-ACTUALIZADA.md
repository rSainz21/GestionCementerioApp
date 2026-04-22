# Cementerio Somahoz — Documentación actualizada

**Proyecto:** aplicación móvil/tablet (Expo / React Native) para gestión y trabajo de campo del cementerio municipal de Somahoz (Los Corrales de Buelna).  
**Código:** `cementerio-app/`  
**Actualización:** abril de 2026 (estado del repositorio según implementación reciente).

---

## 1. Stack técnico

| Área | Tecnología |
|------|------------|
| Framework | **Expo SDK ~54**, **React Native 0.81**, **React 19** |
| Navegación | **Expo Router** (~6), pestañas + stack |
| Backend | **Supabase** (Postgres, Auth, Storage, Edge Functions) |
| Cliente | `@supabase/supabase-js`, sesión en **AsyncStorage** (nativo); web sin persistencia local de sesión por defecto |
| Mapa | Imagen ortofoto + **MapaHotspotsStacked** (pan/zoom con gesture-handler + reanimated) |
| SVG (alternativa mapa) | `react-native-svg` (`CementerioMapa`) |
| Cámara / fotos | `expo-image-picker` |
| GPS | `expo-location` |
| Red / cola offline | `@react-native-community/netinfo`, `@react-native-async-storage/async-storage` |
| Dictado (STT) | `expo-speech-recognition` (limitaciones en Expo Go) |
| PDF | `expo-print`, `expo-sharing` |
| Builds | **EAS** (`eas.json`), `app.config.ts` con `ios.bundleIdentifier` y `android.package` |

---

## 2. Variables de entorno

Definir en `.env` (cargado por `app.config.ts` con `dotenv`) o en el panel de Expo:

```env
EXPO_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
```

Sin estas variables el cliente Supabase no puede conectar.

---

## 3. Cómo ejecutar el proyecto

Desde la carpeta `cementerio-app`:

```bash
npm install
npm run start
```

- **Web:** `npm run web` o `npx expo start --web`
- **Android / iOS:** `npm run android` / `npm run ios`

**Windows / PowerShell:** si `npm`/`npx` fallan por política de ejecución, usar `npm.cmd` y `npx.cmd`, o ejecutar desde **cmd.exe**. Siempre trabajar dentro de `cementerio-app` (no desde `System32`).

---

## 4. Autenticación obligatoria

- **Toda la app (salvo la pantalla de login) exige sesión** de Supabase Auth (`authenticated`).
- Implementación: `app/_layout.tsx` → `RootLayoutNav` usa `useAuth()` + `useSegments()` y `router.replace`:
  - Sin usuario y ruta distinta de `login` → **`/login`**
  - Con usuario en `login` → **`/(tabs)`**
- Mientras `getSession` carga, se muestra un **spinner** a pantalla completa.
- **`unstable_settings.initialRouteName`** = `'login'` para arrancar en login.
- Las **políticas RLS** del esquema SQL solo permiten rol **`authenticated`** en tablas `cemn_*`: sin login no hay escritura coherente con la UI.

**Login / registro:** `app/login.tsx` — email + contraseña (`signIn` / `signUp`).

---

## 5. Navegación y pantallas

### Pestañas (`app/(tabs)/_layout.tsx`)

| Ruta | Descripción |
|------|-------------|
| `mapa` | **Entrada principal** (mapa global sobre ortofoto, hotspots por bloque) |
| `index` | Cuadrícula de nichos del bloque seleccionado en selector horizontal |
| `buscar` | Búsqueda de sepulturas / resultados |
| `mas` | Estadísticas, accesos a admin, gestión registros, login/cerrar sesión |

### Stack raíz (`app/_layout.tsx`)

| Ruta | Uso |
|------|-----|
| `bloque/[id]` | Cuadrícula por **id numérico** o **código** de bloque (ej. `B8`, `B2001`) |
| `sepultura/[id]` | Ficha de nicho + **módulo de auditoría de campo** (strict) |
| `asignar-difunto` | Modal: asignar difunto a sepultura libre |
| `editar-sepultura` | Modal: editar datos del nicho |
| `nueva-concesion` | Modal: nueva concesión |
| `admin-bloques` | Alta de bloques + generación de nichos, listado |
| `gestion-registros` | Difuntos / terceros / concesiones |
| `login` | Acceso (pantalla completa, animación fade) |

---

## 6. Mapa global (Pantalla 1)

- **Archivo:** `app/(tabs)/mapa.tsx`
- **Imagen base:** `assets/images/mapa-somahoz-pnoa.jpg` (ortofoto tipo PNOA/IGN, recorte ROI si aplica).
- **Hotspots:** `lib/mapa-hotspots.ts` (`HOTSPOTS_SOMAHOZ`) + componente **`components/MapaHotspotsStacked.tsx`** (coordenadas en % sobre ROI).
- **Bloques oficiales (10):** `lib/bloques-oficiales.ts` — `B6`, `B7`, `B8`, `BA`, `B2001`, `B2007`, `BD`, `B2017`, `B2020`, `B2025` (520 nichos en total, reglas de filas/columnas documentadas en ese archivo).
- Tap en hotspot → `router.push(/bloque/<codigo>)`.

---

## 7. Estados de sepultura (app vs base de datos)

- En **TypeScript** (`lib/types.ts`): `EstadoSepultura` = **`'libre' | 'ocupada'`** (solo valores que la app permite elegir).
- `EstadoSepulturaDb` incluye **`reservada` | `clausurada`** por compatibilidad con filas antiguas en Postgres.
- **`lib/estado-sepultura.ts`:** `normalizarEstadoEditable()` — todo lo que no es `libre` se trata como **`ocupada`** en UI, leyendas, PDF y navegación.
- **Colores:** `constants/Colors.ts` → `ESTADO_COLORS` solo `libre` / `ocupada`; tema **verde** como acento principal (`ButtonColors`, tint).

---

## 8. Cuadrícula y asignación de difuntos

- **Tap corto en nicho libre** → navegación directa a **`/asignar-difunto?sepultura_id=…&numero=…`** (evita fallos de `Alert` con varios botones en web/tablet).
- **Pulsación larga en libre:** menú con ver ficha vacía / marcar ocupada sin difunto (según pantalla).
- **`lib/query-params.ts`:** `firstParam()` para leer bien query params en web (string | string[]).
- **`app/asignar-difunto.tsx`:** exige **usuario logueado**, valida `sepultura_id`, fecha `AAAA-MM-DD` o vacía, insert en `cemn_difuntos` + update `cemn_sepulturas.estado = 'ocupada'`, errores de insert y update por separado.

---

## 9. Ficha de nicho y auditoría de campo (`app/sepultura/[id].tsx`)

Incluye (entre otras cosas):

- **Barra inferior:** Foto, GPS, Guardar (zona “pulgar”).
- **Modo sol / alto contraste** (“Sunlight”).
- **Swipe** entre nichos del mismo bloque (gesture-handler).
- **Dictado** en notas (`expo-speech-recognition`; en Expo Go puede estar limitado).
- **Strict mode (Pedro / calidad):**
  - GPS solo válido si precisión **&lt; 5 m**; lectura en alta precisión.
  - Estado solo **libre / ocupada** (píldoras).
  - Si pasa de **libre → ocupada**, **foto obligatoria** antes de guardar.
  - **Confirmación** con el **código** exacto de la sepultura.
  - Sin **código** en sepultura → no guardar.
  - Cola offline y sincronización (`lib/auditoria-queue.ts`).

**API de guardado con foto:** `lib/auditoria-api.ts` → `patchSepulturaWithFoto` (multipart) hacia la **Edge Function** `sepulturas-auditoria`.

**Galería:** `components/FotoGaleria.tsx` — prioriza `cemn_documentos` tipo fotografía, refresco y URIs pendientes.

**PDF expediente:** `lib/pdf.ts` — HTML con estilos verdes, evidencias desde documentos, estado normalizado libre/ocupada.

---

## 10. Edge Function `sepulturas-auditoria`

- **Ruta en repo:** `supabase/functions/sepulturas-auditoria/index.ts`
- Espera **`multipart/form-data`**: campos de sepultura + opcional archivo `foto`.
- Valida que **`estado`** sea solo **`libre`** u **`ocupada`** si se envía.
- Sube foto a Storage, inserta en **`cemn_documentos`** (u otra tabla según implementación), actualiza **`cemn_sepulturas`**, registra **`cemn_audit_events`**.

Despliegue y URL según documentación de Supabase (CLI `supabase functions deploy`).

---

## 11. Base de datos (resumen `supabase/schema.sql`)

| Tabla | Rol |
|-------|-----|
| `cemn_zonas` | Zonas del cementerio |
| `cemn_bloques` | Bloques por zona (filas × columnas) |
| `cemn_sepulturas` | Nichos: código, estado, notas, `lat`/`lon`, etc. |
| `cemn_terceros` | Titulares |
| `cemn_difuntos` | Difuntos vinculados a sepultura |
| `cemn_concesiones` | Concesiones |
| `cemn_fotos` | Fotos (legacy / campo) |
| `cemn_documentos` | Documentos y evidencias (`tipo`, `url`, …) |
| `cemn_audit_events` | Traza de auditoría (JSON payload, actor, fuente) |

**RLS:** políticas para rol **`authenticated`** en lectura/escritura (según tabla; audit events insert/select acotados en el SQL).

---

## 12. Otros módulos

- **Admin bloques:** creación de bloque + inserción masiva de sepulturas con códigos generados (`app/admin-bloques.tsx`).
- **Gestión registros:** listados y búsquedas sobre difuntos/terceros/concesiones.
- **Buscar:** resultados con badge de estado coloreado vía `colorParaEstadoSepultura`.

---

## 13. Builds Android (tablet) con EAS

- **`eas.json`:** perfiles `development`, `preview`, `production`.
- **`app.config.ts`:** `android.package`, `ios.bundleIdentifier`, `supportsTablet: true`.
- Comando típico (con cuenta Expo y proyecto enlazado):  
  `eas build --platform android --profile preview`  
  (o `production` para tienda / release).

Resolver conflictos de dependencias nativas (p. ej. evitar librerías que mezclen AndroidX con support antiguo) antes del build en la nube.

---

## 14. Estructura útil del código

```
cementerio-app/
├── app/                    # Expo Router (pantallas)
│   ├── _layout.tsx         # Auth global + Stack
│   ├── login.tsx
│   ├── (tabs)/             # mapa, index, buscar, mas
│   ├── bloque/[id].tsx
│   ├── sepultura/[id].tsx
│   ├── asignar-difunto.tsx
│   ├── editar-sepultura.tsx
│   ├── nueva-concesion.tsx
│   ├── admin-bloques.tsx
│   └── gestion-registros.tsx
├── components/             # MapaHotspotsStacked, FotoGaleria, NichoGrid, …
├── constants/Colors.ts     # Tema y ESTADO_COLORS
├── lib/
│   ├── supabase.ts
│   ├── auth-context.tsx
│   ├── types.ts
│   ├── bloques-oficiales.ts
│   ├── mapa-hotspots.ts
│   ├── estado-sepultura.ts
│   ├── query-params.ts
│   ├── auditoria-api.ts
│   ├── auditoria-queue.ts
│   ├── photos.ts
│   └── pdf.ts
├── supabase/
│   ├── schema.sql
│   └── functions/sepulturas-auditoria/
├── assets/images/          # mapa-somahoz-pnoa.jpg, iconos, etc.
├── app.config.ts
├── eas.json
└── DOCUMENTACION-ACTUALIZADA.md   # este archivo
```

---

## 15. Recordatorios operativos

1. **Siempre** tener usuarios de campo dados de alta en **Supabase Auth** y políticas alineadas.
2. Tras cambios en **RLS** o **esquema**, redeploy de **Edge Functions** si afectan al contrato del cliente.
3. Probar **asignar difunto** y **auditoría** en dispositivo real (GPS, cámara) además de web.
4. Mantener **ortofoto** y **hotspots** sincronizados si cambia la imagen base (`roi` / porcentajes en `mapa-hotspots.ts`).

---

*Este documento resume el diseño y los archivos clave; no sustituye el código fuente ni los comentarios inline. Para detalle de API de Supabase, consultar el panel del proyecto y la documentación oficial de Supabase.*
