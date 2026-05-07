# CLAUDE.md - Conect@ 2.0

> Fichero de contexto para agentes AI (Claude, Cursor, Copilot, etc.)
> **Actualizar tras cada sprint o fase importante.**

**Última actualización del contexto:** abril 2026.

## Situación actual (abril 2026)

- **Propuestas**, **Terceros**, **Notificaciones v2** y **administración base** están en uso y consolidados.
- **Personal / Fichajes (v2)** está **operativo** para empleados y supervisión (ZKTime, cuadrantes, exportaciones PDF/CSV). Detalle: `docs/ESTADO_PROYECTO.md` (Sprint 6).
- **Citas DNI** está **implementado** en la nueva stack (API Laravel + Vue): agenda por días habilitados, huecos, PDF de cita con texto HTML sanitizado, pantalla de ajustes separada. Permisos: `dni.ver`, `dni.editar`.
- **Siguiente foco organizativo:** el equipo que desarrollará el **módulo de Cementerio** (tablas legacy `cemen_*`) está **a punto de incorporarse**. Conviene alinear convenciones del repo, permisos Spatie y revisión de `docs/ESTADO_PROYECTO.md` / `docs/CHANGELOG.md` antes de abrir desarrollo en rama dedicada.

## Guía UX

Las **nuevas vistas y refactors de interfaz** deben seguir los criterios de jerarquía, lenguaje, color y acciones descritos en **[`docs/GUIA_UX_CONECTA2.md`](docs/GUIA_UX_CONECTA2.md)**. Ese documento es la referencia canónica para UX en Conect@ 2.0.

## Proyecto

**Conect@ 2.0** es una aplicación de gestión municipal integral que reemplaza a la versión 1.0 (PHPRunner + módulos PHP custom). Se despliega en el mismo servidor que la versión anterior, coexistiendo en `/conecta2/`.

## Stack técnico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Backend | Laravel | 12.x |
| PHP | PHP | 8.2 |
| Base de datos | MySQL | 8.x |
| Frontend | Vue 3 (Composition API, `<script setup>`) | 3.5.x |
| Build | Vite | 7.x |
| UI | PrimeVue 4 + preset Aura | 4.5.x |
| State | Pinia | 3.x |
| Router | Vue Router | 4.x |
| HTTP | Axios (con interceptores Bearer token) | 1.x |
| Auth | Laravel Sanctum (Bearer tokens, NO cookies) | 4.x |
| Permisos | Spatie laravel-permission | 6.x |

**Caducidad de tokens:** variable de entorno `SANCTUM_EXPIRATION` (minutos). Si no está definida o está vacía, los tokens **no caducan por tiempo** (`config/sanctum.php`). Con valor (p. ej. `480`), al expirar la API responde **401**; el cliente (`resources/js/services/api.js`) limpia almacenamiento local, opcionalmente muestra aviso en la pantalla de login y redirige a `/conecta2/login`. El cierre de sesión explícito sigue invalidando el token en servidor.
| PDF | barryvdh/laravel-dompdf | 3.x |
| Import/Export | openspout/openspout | 4.x |

## Servidor / Despliegue

- **Host**: 10.10.20.31 (Docker container `857031f3f178`)
- **Puerto externo**: 8181
- **URL**: `http://10.10.20.31:8181/conecta2/`
- **Apache**: Alias `/conecta2` → `/var/www/html/conecta2/public`
- **Requiere**: `AllowOverride All` en `/var/www/html` y `RewriteBase /conecta2/` en `.htaccess`
- **Usuario shell**: `conecta` (sin sudo, sin root)
- **Usuario web**: `www-data` (Apache)
- **Permisos**: `storage/` y `bootstrap/cache/` deben ser `777` (sin sudo para chown)

## Bases de datos

| Conexión | BD | Uso |
|----------|-----|-----|
| `mysql` (default) | `conecta2` | App principal nueva |
| `legacy` | `conecta` | Lectura de datos v1.0 para migración |
| `zktime` | `zktime` | Fichajes (sistema ZKTime) |

Credenciales en `.env`: host `10.10.20.31`, port `3317`, user `conecta_user`.

## Estructura del proyecto

```
conecta2/
├── app/
│   ├── Console/Commands/
│   │   ├── ImportDataCommand.php          # Importar datos legacy
│   │   └── SyncGestionaEstadosCommand.php # Cron sync Gestiona (cada 15 min)
│   ├── Http/Controllers/
│   │   ├── Auth/                  # AuthController (login/logout/me)
│   │   ├── Admin/                 # UserController, RoleController, SettingsController
│   │   ├── Propuestas/            # PropuestaController, CatalogoController, OtpController
│   │   ├── Gestiona/              # SandboxController
│   │   ├── Personal/              # Fichajes, turnos, departamentos, calendarios…
│   │   ├── Dni/                   # DniController (citas, días, slots, ajuste, PDF)
│   │   ├── TerceroController.php
│   │   └── NotificationController.php
│   ├── Imports/                   # BaseImporter, UserImporter, PropuestaImporter
│   ├── Models/                    # User, Propuesta, Tercero, Notification, Dni*, Personal*…
│   └── Services/
│       ├── Gestiona/              # Cliente API expedientes/documentos/firmas
│       ├── Dni/                   # DniSlotService (huecos, validación turnos)
│       ├── PropuestaPdfService.php, PropuestaGestionaService.php, …
│       └── Personal/              # Lógica fichajes, esperado, cuadrantes…
├── database/migrations, seeders/
├── resources/js/
│   ├── layouts/DefaultLayout.vue
│   ├── pages/
│   │   ├── admin/, propuestas/, terceros/, gestiona/, notificaciones/
│   │   ├── personal/              # PersonalPage, MisFichajesV2Page (empleado / gestión)
│   │   └── dni/                   # DniPage.vue, DniAjustePage.vue
│   ├── router/index.js
│   ├── stores/                    # auth.js, theme.js
│   └── services/api.js            # Axios baseURL /conecta2/api, Bearer token
├── routes/
│   ├── api.php                    # Rutas REST (permisos por middleware); volumen elevado
│   └── console.php                # Schedule: gestiona:sync-estados cada 15 min
└── public/build/                  # Vite
```

> Para el conteo exacto de rutas: `php artisan route:list`. La cifra fija de “N endpoints” deja de mantenerse a mano.

## Autenticación y permisos

- Login: `POST /api/login` → devuelve Bearer token
- Token almacenado en `localStorage` como `conecta2_token`
- Middleware: `auth:sanctum` para rutas protegidas
- Middleware: `role:super_admin` para rutas admin
- **Roles acumulables**: empleados, personal, propuestas, otp_validador, admin, super_admin
- Permisos granulares: `{modulo}.{accion}` (ej: `propuestas.crear`, `propuestas.otp.validar`)
- Helper frontend: `auth.can('propuestas.ver')`, `auth.hasRole('super_admin')`

## Sistema de configuración

- Tabla `settings` con columnas: `group`, `key`, `value`, `type`, `label`, `description`, `is_public`
- Endpoint público: `GET /api/settings/public` (no requiere auth)
- Store Pinia `theme.js` carga settings al arranque y aplica CSS vars dinámicamente

## Paleta de colores corporativa

| Token CSS | Color | Uso |
|-----------|-------|-----|
| `--c2-primary` | `#118652` | Verde institucional principal |
| `--c2-primary-dark` | `#0D6B42` | Hover/activos |
| `--c2-primary-light` | `#1CA46B` | Variante clara |
| `--c2-secondary` | `#C9A227` | Oro heráldico (acento) |
| `--c2-tertiary` | `#1266A3` | Azul heráldico (links, badges) |
| `--c2-danger` | `#A61B1B` | Rojo peligro |
| `--c2-warning` | `#C44536` | Rojo alerta |
| `--c2-success` | `#0F7A4A` | Verde éxito |
| `--c2-sidebar-bg` | `#0E2F2A` | Sidebar oscuro |
| `--c2-bg` | `#F5F7F4` | Fondo general claro |
| `--c2-text` | `#17231F` | Texto principal |

## Módulo Propuestas (Fase 1 + Fase 1.5)

### Modelo de datos

- **Modo**: Solo "1 propuesta = 1 expediente" (expediente único eliminado)
- **Responsable**: Referencia a `users` (usuarios con `gestiona_user_uuid`), no a tabla auxiliar
- **Ofertas**: Con campo `adjudicada`, upload de documento obligatorio, adjudicación rellena datos económicos
- **Terceros**: Módulo global (ex-empresas). Con `gestiona_third_id`, sync, búsqueda CIF API Gestiona, tipo JURIDICAL/PHISIC
- **AD**: Documento obligatorio para crear expediente, salvo OTP activo
- **OTP**: Tabla `propuesta_ad_codigos` con TTL, estados, auditoría de uso
- **OTP Solicitudes**: Flujo solicitud→aprobación (tabla `propuesta_otp_solicitudes`, notificaciones al validador y solicitante)
- **Notificaciones**: Tabla `notifications` con tipo, título, mensaje, datos JSON

### API Endpoints (69)

| Grupo | Endpoints | Permiso |
|-------|-----------|---------|
| Terceros | CRUD + buscar-cif-gestiona + sync-gestiona | auth |
| Propuestas CRUD | GET/POST/PUT/DELETE `/api/propuestas` | ver/crear/editar/eliminar |
| Ofertas | POST adjudicar, POST upload doc, DELETE | editar |
| AD Upload | POST `/api/propuestas/{id}/upload-ad` | editar |
| Gestiona | generar-pdf, crear-expediente, sync-estado | gestiona |
| OTP | estado, generar, validar, revocar | ver/gestiona/otp.validar |
| OTP Solicitudes | solicitar, listar, aprobar, rechazar | gestiona/otp.validar |
| Catálogos | CRUD tipos-contrato, órganos, aplicaciones | ver/editar |
| Notificaciones | index, count, marcar leída/todas | auth |
| Admin Users | CRUD + edit (gestiona_uuid) + roles | super_admin |
| Admin Settings | groups, show, update (TabView 6 tabs) | super_admin |
| Sandbox Gestiona | POST `/api/gestiona-sandbox/action` | super_admin |

### Integración Gestiona

- **Flujo**: tercero → expediente → usuarios → field groups → PDF + AD + ofertas (carpeta OFERTAS) → circuitos firma
- **Protección duplicado**: Palabra mágica para recrear expediente
- **AD bypass**: Sistema OTP con generación, validación, revocación y auditoría
- **Sync automático**: Cron cada 15 min (`gestiona:sync-estados`) con notificaciones de cambio
- **Sandbox**: Módulo admin con todos los métodos de la API legacy portados (25+ acciones)

### Frontend

| Ruta | Componente | Función |
|------|-----------|---------|
| `/conecta2/terceros` | `TercerosPage.vue` | CRUD global terceros + sync Gestiona |
| `/conecta2/propuestas` | `PropuestasListPage.vue` | DataTable con ID, búsqueda, link Expediente Gestiona |
| `/conecta2/propuestas/nueva` | `PropuestaFormPage.vue` | Formulario con doble botón Guardar (top+bottom) |
| `/conecta2/propuestas/:id` | `PropuestaDetallePage.vue` | Detalle + botón Volver + OTP banner + acciones Gestiona |
| `/conecta2/propuestas/:id/editar` | `PropuestaFormPage.vue` | Editar propuesta |
| `/conecta2/admin/settings` | `SettingsPage.vue` | TabView unificado (6 tabs incl. Propuestas con catálogos) |
| `/conecta2/gestiona-sandbox` | `SandboxPage.vue` | Sandbox API Gestiona (solo admin) |
| `/conecta2/personal` | `PersonalPage.vue` | Fichajes gestión + equipo + cuadrante policial |
| `/conecta2/mis-fichajes-v2` | `MisFichajesV2Page.vue` | Control horario empleado |
| `/conecta2/dni` | `DniPage.vue` | Citas DNI (mes, listado, huecos) |
| `/conecta2/dni/ajustes` | `DniAjustePage.vue` | Franja horaria, PDF, **tabla días disponibles del mes** (`dni.editar`) |

## Módulos: estado y roadmap

| Módulo | Estado | Notas / legacy |
|--------|--------|----------------|
| **Cementerio** | **Próximo desarrollo** | Tablas legacy `cemen_*`. **Equipo a punto de incorporarse** — acordar alcance, permisos (`cementerio.*`) y convenciones de carpetas antes del primer merge. Ver `docs/ESTADO_PROYECTO.md` (Fase Cementerio). |
| Personal / Fichajes | En producción (v2) | BD `zktime`, lógica en `app/Http/Controllers/Personal/`, `app/Services/Personal/` |
| Citas DNI | En producción | Tablas `dni_*`, `DniController`, permisos `dni.ver` / `dni.editar` |
| Residuos | Planificado | `residuos_*` |
| Enseres | Planificado | `enseres_*` |
| Locales + licencias | Planificado | `locales_*`, `ep_licencia_*` |
| Notificaciones (módulo legado municipio) | Planificado | Distinto de la bandeja in-app ya implementada |

### Módulo Cementerio — pistas para el equipo que entra

1. **Documentación**: `docs/ESTADO_PROYECTO.md`, `docs/CHANGELOG.md`, paleta `docs/PALETA_COLORES.md` si aplica UI.
2. **Patrones del repo**: controladores por dominio bajo `app/Http/Controllers/`, rutas en `routes/api.php` con `middleware('permission:…')`, páginas Vue bajo `resources/js/pages/`, registro en `router/index.js` y entradas de menú en `DefaultLayout.vue` (grupos `registro`, etc.).
3. **Permisos**: extender `database/seeders/RolesAndPermissionsSeeder.php` (o migraciones de permisos) de forma coherente con el resto de módulos.
4. **Coexistencia**: la app v1 sigue en paralelo; migración/importación legacy cuando se defina (similar a `ImportDataCommand` / importadores existentes).

## Comandos útiles

```bash
php artisan migrate                            # Ejecutar migraciones
php artisan migrate:fresh --seed               # Reset completo
php artisan db:seed --class=PropuestasCatalogSeeder
php artisan import:data propuestas             # Importar datos legacy
php artisan import:data propuestas --dry-run
php artisan gestiona:sync-estados              # Sync manual Gestiona
php artisan gestiona:sync-estados --propuesta=1
npx vite build                                 # Build frontend
php artisan route:list --path=propuestas       # Ver rutas
```

## Credenciales de desarrollo

- **Admin**: `admin` / `admin2026` (rol: `super_admin`)
- **BD**: ver `.env`

## Historial de sprints

### Sprint 0 - Fase 0: Infraestructura base (31/03/2026)
- Proyecto Laravel 12, Sanctum + Spatie Permission
- Auth completa, sistema configuración centralizado, theme engine CSS vars
- Layout responsive con sidebar, admin pages, importadores
- Apache configurado, branding, paleta corporativa Corrales

### Sprint 1 - Fase 1: Módulo Propuestas base (31/03/2026)
- 11 tablas, 11 modelos, 5 servicios Gestiona, PDF, 18 endpoints
- Frontend: listado, formulario, detalle con acciones Gestiona
- Importador legacy, settings módulo

### Sprint 2 - Fase 1.5: Refactoring completo Propuestas (31/03/2026)
- **Eliminado modo "expediente único"**: campos gestiona_num, gestiona_ano, gestiona_ruta borrados
- **Responsable = usuario Gestiona**: desplegable desde tabla users (campo gestiona_user_uuid)
- **Ofertas rediseñadas**: upload documento obligatorio, botón adjudicar, adjudicación rellena económicos
- **Empresas con Gestiona**: modal crear con búsqueda CIF en API Gestiona, autocompletar datos
- **AD obligatorio + OTP**: sistema completo de códigos temporales (generar, validar, revocar, auditoría)
- **Palabra mágica**: protección contra duplicación de expedientes
- **Cron sync Gestiona**: cada 15 min, con notificaciones de cambio de estado a usuarios
- **Sistema notificaciones**: tabla, API (listar, count, marcar leída), preparado para UI
- **Catálogos CRUD**: página ajustes con tabs (tipos contrato, órganos, aplicaciones)
- **Sandbox Gestiona**: módulo completo admin-only, 25+ acciones API, UI moderna con tabs y resultados JSON
- **Reordenación formulario**: Expediente → Objeto → Ofertas → Adjudicación/LCSP → Datos económicos
- **Defaults**: fecha_documento = hoy, duración = 1 día
- **31+ endpoints API**, migración nueva, frontend 6 páginas Vue

### Sprint 3 - Fase 2: Terceros, Settings unificado, Roles, OTP workflow (31/03/2026)
- **Terceros global**: Renombrado empresas→terceros (tabla, modelo, FK, controller), módulo CRUD global con sync Gestiona, página Vue
- **Edición usuarios**: Dialog completo en UsersPage (name, username, email, gestiona_user_uuid, gestiona_third_uuid, password)
- **Settings unificado**: TabView con 6 pestañas (General, Tema, Gestiona, Auth, Notificaciones, Propuestas). Catálogos integrados en tab Propuestas
- **Roles granulares**: 6 roles acumulables (empleados→super_admin), 27 permisos granulares, seeder completo
- **OTP workflow**: Solicitud con justificación → notificación validador → aprobación/rechazo → código generado → notificación solicitante
- **UX propuestas**: Columna ID + Expediente Gestiona con link externo en listado, botón Volver en detalle, doble Guardar en formulario
- **69 endpoints API**, 4 migraciones, 8 páginas Vue, build OK

### Sprint 4 - Propuestas hardening + documentos de resolución/notificación (01/04/2026)
- **Normalización CIF/NIF terceros**: helper `CifNormalizer`, unicidad real en BD (`terceros.cif`), búsquedas y sync Gestiona con CIF normalizado.
- **Corrección rutas documentos**: AD/ofertas usan `Storage::disk('public')`; PDF propuesta mantiene ruta dedicada.
- **Bloqueo edición con expediente**: propuestas con `gestiona_file_id` no admiten cambios (backend + redirección frontend desde edición).
- **Flujo OTP reforzado**: solicitud visible en detalle, notificación a validadores/admin, uso de OTP activo en creación de expediente.
- **Descargas y listado documentos**: columnas separadas en listado para Propuesta, AD, Resolución y Notificación; descargas directas.
- **Nuevos documentos**: generación conjunta de **resolución** y **notificación** en PDF (sin logotipos si no hay GD), subida conjunta a Gestiona y firma por circuitos específicos.
- **Nuevos settings**: `gestiona_circuit_template_resolucion_id`, `gestiona_circuit_template_notificacion_id`.
- **Nuevos campos propuesta**: `file_resolucion`, `file_notificacion`, IDs de documento en Gestiona y estados de firma/track de ambos.
- **Permiso nuevo**: `propuestas.resolucion.generar` para habilitar generación/subida de resolución+notificación.
- **UI detalle/listado compactada**: columnas y tipografías reducidas, ojo de detalle a la izquierda, paneles ajustados para mejor lectura en anchos medios.
- **Permisos críticos robustecidos**: autocreación/asignación a `super_admin` de `propuestas.otp.validar` y `propuestas.resolucion.generar` en `AppServiceProvider` para evitar 403 por desajustes de entorno.
- **UX barra de acciones en detalle**: acción principal dinámica por estado + menús `Descargar` y `Más acciones` para reducir saturación de botones.
- **Tema Gestiona configurable**: nuevo setting público `theme.gestiona_color` (`#fa6400` por defecto) aplicado a enlaces y acciones de Gestiona en Propuestas.

### Sprint 5 - Usuarios + Notificaciones v2 (01/04/2026)
- **Usuarios (admin) reforzado**: alta y baja de usuarios (`POST/DELETE /admin/users`), búsqueda ampliada y edición unificada con ficha empleado.
- **Campo ZKTime**: nuevo `users.zktime_user_id` para vinculación futura con fichajes (sin acoplar aún la app a consultas en BD zktime).
- **Bandeja de notificaciones**: nueva página `/conecta2/notificaciones` con filtros por tipo, búsqueda, no leídas, paginación y acciones (leer/leer todas/ver propuesta).
- **Notificaciones globales UX**: campana en topbar + badge lateral + polling de contador + avisos toast de nuevas notificaciones con deduplicación.
- **Servicio unificado**: `NotificationService` centraliza canales `in_app`, `email` y base `push`, reutilizado por OTP y sync Gestiona.
- **Preferencias por usuario**: endpoint `GET/PUT /me/notification-preferences` con control de toasts, intervalos, tipos silenciados (toast/email).
- **Email avanzado**:
  - filtros globales por tipo (`notificaciones.email_enabled_types`)
  - plantillas por tipo (`notificaciones.email_templates`) con placeholders (`{{title}}`, `{{message}}`, `{{data.*}}`, etc.).
- **Base push móvil**:
  - tabla `notification_devices`
  - endpoints `GET/POST/DELETE /me/notification-devices`
  - panel UI para registrar/listar/desactivar dispositivos.
- **Operación y diagnóstico**:
  - endpoint de prueba `POST /me/notifications/test` con resultado por canal
  - métricas `GET /notifications/stats`
  - exportación CSV `GET /notifications/stats/export` con bloques por tipo y canal.

### Sprint 6 - Personal + Fichajes v2 (02/04/2026)
- **ZKTime** integrado con modo degradado; cálculo de trabajado (pares entrada/salida) y esperado por asignación / default de departamento.
- **Configuración**: departamentos, calendarios, festivos, horarios, tramos, asignaciones, defaults por departamento con vigencias validadas.
- **UX empleado** (`MisFichajesV2Page`): vistas semanal/mensual, festivos/incidencias, KPIs, export PDF.
- **UX gestión** (`PersonalPage`): equipo unificado con resumen, incidencias, rankings, cuadrante mensual; cuadrante policial con patrones/overrides y exportaciones CSV/PDF.
- Documentación de detalle: `docs/PERSONAL_FICHAJES_ANALISIS.md`, `docs/ESTADO_PROYECTO.md`.

### Sprint 7 - Citas DNI (04/2026)
- **Dominio**: ajustes globales (`dni_ajustes`), días habilitados (`dni_dias_disponibles` / modelo `DniDiaDisponible`), citas (`dni_citas`); servicio `DniSlotService` para huecos y cupos.
- **API**: resumen por mes, listado de días del mes con ocupación, toggle de día, slots, CRUD citas, PDF cita (DomPDF), `PUT /dni/ajuste`.
- **Frontend**: `DniPage.vue` (citas del mes, selector de día con agenda, huecos); `DniAjustePage.vue` (franja horaria, texto PDF con HTML limitado, mapa, **tabla de todos los días del mes** para habilitar citas).
- **Corrección operativa**: filtro de listado de citas por `mes=YYYY-MM` en servidor y límite `per_page` alineado con el cliente (evitar 422 silencioso en la tabla del mes).
