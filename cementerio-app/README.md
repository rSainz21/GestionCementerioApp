# Cementerio Somahoz (Expo / React Native)

Aplicación móvil/tablet para **gestión y trabajo de campo** del cementerio municipal de Somahoz.

- **Frontend**: Expo SDK ~54 + React Native + Expo Router
- **Backend**: Laravel (API REST + Sanctum)

## Requisitos

- Node.js + npm

## Variables de entorno

```env
EXPO_PUBLIC_LARAVEL_BASE=http://192.168.100.69:8000
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
- **Persistencia de sesión**: token en AsyncStorage.

## Pantallas principales (campo)

- **`Campo`** (`app/(tabs)/campo.tsx`): buscador + selección de sepultura + botón principal **NUEVO SUCESO**.
- **`Nuevo suceso`** (`app/nuevo-suceso.tsx`): wizard para elegir suceso y seleccionar sepultura:
  - Buscar por código/número
  - Elegir bloque + **grid de nichos** (vista completa)

## Flujos operativos (workflows)

### Inhumación / Añadir difunto

- UI: `app/asignar-difunto.tsx`
- Backend: `POST /api/cementerio/workflows/inhumacion`

### Exhumación / Traslado

- UI: `app/exhumacion-traslado.tsx`
- Backend: `POST /api/cementerio/workflows/exhumacion`

### Añadir Documento/Foto

- UI: `app/anadir-documento-foto.tsx`
- Backend:
  - `POST /api/cementerio/sepulturas/{id}/documentos` (archivo)
  - `POST /api/cementerio/difuntos/{id}/foto` (foto del difunto)

### Cambio de estado rápido (seguro)

- Solo permite liberar si **no hay difuntos vinculados**.

## Notas operativas

- El backend requiere usuario con permisos `cementerio.*` para operar.

## Documentación extendida

Ver `DOCUMENTACION-ACTUALIZADA.md`.

