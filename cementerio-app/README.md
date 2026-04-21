# Cementerio Somahoz (Expo / React Native)

Aplicación móvil/tablet para **gestión y trabajo de campo** del cementerio municipal de Somahoz.

- **Frontend**: Expo SDK ~54 + React Native + Expo Router
- **Backend**: API HTTP (`mysql-api`) contra MySQL (misma BD que la web)

## Requisitos

- Node.js + npm
- Cuenta/proyecto de Supabase

## Variables de entorno

Crear `cementerio-app/.env` (copia desde `.env.example`):

```env
EXPO_PUBLIC_API_BASE=http://192.168.100.69:8000/mysql-api
EXPO_PUBLIC_API_TOKEN=dev-token-cambia-esto
```

## Instalar y ejecutar

Desde `cementerio-app/`:

```bash
npm install
npm run start
```

### Web (navegador)

```bash
npm run web
```

Si el puerto está ocupado, usa otro:

```bash
npx.cmd expo start --web --port 8082
```

> En PowerShell, si `npx` falla, usa `npx.cmd`.

## Autenticación (obligatoria)

- La app obliga a iniciar sesión para usar casi todas las pantallas (redirige a `/login` si no hay sesión).
- **Persistencia de sesión**: en nativo usa AsyncStorage y en web usa `localStorage` (si está disponible).

## Pantallas principales (campo)

- **`Campo`** (`app/(tabs)/campo.tsx`): buscador + selección de sepultura + botón principal **NUEVO SUCESO**.
- **`Nuevo suceso`** (`app/nuevo-suceso.tsx`): wizard para elegir suceso y seleccionar sepultura:
  - Buscar por código/número
  - Elegir bloque + **grid de nichos** (vista completa)

## Flujos operativos (workflows)

### Inhumación / Añadir difunto

- UI: `app/asignar-difunto.tsx`
- Preferente: RPC `cemn_workflow_inhumacion(...)` (transaccional).
- Fallback: inserta en `cemn_difuntos` y marca `cemn_sepulturas.estado = 'ocupada'` si el RPC no existe aún.

### Exhumación / Traslado

- UI: `app/exhumacion-traslado.tsx`
- Backend: RPC `cemn_workflow_exhumacion(...)` (transaccional)
  - Inserta en `cemn_movimientos`
  - Desvincula difunto de la sepultura
  - Si queda vacía → vuelve a `estado = 'libre'`

### Añadir Documento/Foto

- UI: `app/anadir-documento-foto.tsx`
- Backend: Edge Function `supabase/functions/sepulturas-auditoria`
  - `multipart/form-data` con `foto`
  - Sube a Storage (`fotos-cementerio`)
  - Inserta en `cemn_documentos` tipo `fotografia` (con fallback a `cemn_fotos`)

### Cambio de estado rápido (seguro)

- Solo permite liberar si **no hay difuntos vinculados**.

## Backend `mysql-api`

El servicio corre junto a la web en Docker y se expone por Nginx:

- Healthcheck: `GET /mysql-api/health`
- Workflows:
  - `POST /mysql-api/workflows/inhumacion`
  - `POST /mysql-api/workflows/exhumacion`

Todos requieren header:

- `Authorization: Bearer <EXPO_PUBLIC_API_TOKEN>`

## Documentación extendida

Ver `DOCUMENTACION-ACTUALIZADA.md`.

