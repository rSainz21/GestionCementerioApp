# Arquitectura (alto nivel)

## Componentes

### 1) API (Laravel)

- **Rutas**: `routes/api.php` (`/api/cementerio/*`)
- **Controladores**: `app/Http/Controllers/Cementerio/`
- **Modelos**: `app/Models/Cemn*`
- **Permisos**: middleware `permission:cementerio.*` (Spatie)
- **Auditoría**: se registran cambios relevantes en entidad de cambios (ej. actualizaciones de sepultura).
- **Documentos/fotos**: subida a storage público y referencia desde la ficha.

### 2) Web (Vue 3 + PrimeVue)

- **Entrada**: `resources/js/app.js`
- **Layout**: `resources/js/layouts/DefaultLayout.vue`
- **Páginas**: `resources/js/pages/cementerio/*`
- **Componentes**: `resources/js/components/cementerio/*`

### 3) App de campo (Expo / React Native)

- **Rutas Expo Router**: `cementerio-app/app/*`
- **Capa API**: `cementerio-app/lib/laravel-api.ts` (token Bearer + manejo de errores)
- **UI base**: `cementerio-app/components/ui/*` (tokens, botones, cards, inputs…)
- **Offline**: cola de cambios (auditoría) y sincronización manual/automática.

## Decisiones clave

- **Separación Web vs Campo**: la web optimiza administración; la app optimiza interacción in situ (tacto, latencia, uso offline).
- **Permisos granulares**: simplifica cumplimiento y reduce riesgo operativo.
- **Diseño semántico**: tokens (`Semantic`, `Radius`, `Space`, `Type`) para consistencia y mantenimiento.
- **Despliegue LAN**: Docker + persistencia (BD y storage) para un servidor municipal accesible desde PCs de red.

