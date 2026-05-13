# CLAUDE.md - Conect@ 2.0

> Fichero de contexto para agentes AI (Claude, Cursor, Copilot, etc.)
> **Actualizar tras cada sprint o fase importante.**

**Última actualización del contexto:** 2026-05-11 (Sesión 2 — tarde). **Nota 2026-05-13:** checklist hecho/pendiente del módulo cementerio en [`docs/cosas-pendientes.md`](docs/cosas-pendientes.md) (mantener alineado con el devlog al cerrar tareas).

## Situación actual (mayo 2026)

> **Atención:** Este repo (`/var/www/html`) es la **app independiente GestionCementerioApp**, no el trunk de Conect@ 2.0. El CLAUDE.md original describe Conect@ 2.0 como contexto de convenciones; la sección relevante para el trabajo activo es **"GestionCementerioApp — estado actual"** más abajo.

- **Propuestas**, **Terceros**, **Notificaciones v2** y **administración base** de Conect@ 2.0 están en uso y consolidados (contexto de referencia).
- **Personal / Fichajes (v2)** operativo en Conect@ 2.0.
- **Citas DNI** implementado en Conect@ 2.0.
- **GestionCementerioApp** — módulo de cementerio Somahoz **en desarrollo activo** como app standalone. Ver sección dedicada más abajo, `docs/devlog/DEVLOG_2026-04-16.md` y la checklist viva [`docs/cosas-pendientes.md`](docs/cosas-pendientes.md).

---

## GestionCementerioApp — estado actual (2026-05-11 Sesión 2)

App web de gestión del Cementerio Municipal de Somahoz (y futuros cementerios). Stack: Laravel 12 + Vue 3 + PrimeVue 4 + Leaflet + ApexCharts. Auth Sanctum + Spatie. BD: MariaDB vía socket `/tmp/mariadb.sock`.

### Módulos implementados

| Módulo | Estado | Notas |
|--------|--------|-------|
| Auth (Sanctum + Spatie) | ✅ Operativo | `cementerio.ver / .editar / .admin` |
| **Selector multi-cementerio** | ✅ Operativo | Dropdown en topbar; persiste en localStorage; filtra todos los datos por cementerio activo |
| **Gestión de usuarios** | ✅ Operativo | CRUD completo + asignación roles/permisos; ruta `/cementerio/usuarios`; solo visible con `cementerio.admin` |
| Dashboard (Inicio) | ✅ Operativo | KPIs, gráficas donut, buscadores inline, mapa GPS + toolbar nueva zona/bloque + pantalla completa |
| Gestión CRUD | ✅ Operativo | Cementerios, Zonas, Bloques, Sepulturas, Difuntos, Concesiones, Terceros |
| Formularios CRUD reutilizables | ✅ Operativo | `ZonaFormDialog.vue` y `BloqueFormDialog.vue` — usados en Gestión Y en toolbar del mapa |
| Nuevo caso (wizard) | ✅ Operativo | 4 pasos: titular → difunto → unidad (grid) → resumen |
| Detalle de sepultura | ✅ Operativo | Expediente digital, edición inline, fotos, docs, + difuntos/concesiones, historial movimientos |
| Regularizaciones (drag&drop) | ✅ Operativo | Drag & drop difuntos/concesiones a nichos; grid se refresca post-drop |
| Regularización masiva | ✅ Operativo | Página `/cementerio/regularizacion`; tabla paginada + SepulturaSearchInline; badge en sidebar |
| Mapa GPS | ✅ Operativo | Leaflet con capas zonas/bloques/sepulturas, polígonos, selección directa |
| Mapa toolbar | ✅ Operativo | Botones "Nueva zona" / "Nuevo bloque" (formulario completo) + "Pantalla completa" |
| Alertas sidebar | ✅ Operativo | 4 grupos: caducadas, próximas (N días dinámico), difuntos sin ubicar, concesiones sin nicho |
| **Configuración** | ✅ Operativo (rutas restauradas) | Panel drawer; 26 ajustes en BD; CSS vars en vivo; info sistema; backup. **Nota:** las rutas `/api/cementerio/settings`, `/sistema`, `/backup/download` no estaban registradas — corregido en Sesión 2. |
| Papelera | ✅ Operativo (rutas restauradas) | Soft deletes en difuntos/concesiones/terceros; restaurar/borrar definitivo |
| Backup SQL | ✅ Operativo (ruta restaurada) | Descarga .sql vía API con Bearer token |
| MapaPicker con zonas | ✅ Operativo | Polígonos de zona en el picker; validación punto-en-polígono; aviso si fuera |
| Buscador global | ✅ Operativo (ruta restaurada) | Topbar (botón + atajo `/`), resultados agrupados: sepulturas / difuntos / concesiones / terceros |
| Renovación de concesiones | ✅ Operativo (rutas restauradas) | Botón "Renovar" en ConcesionDetalleModal + formulario inline + historial timeline de cadena |
| Vistas detalle Gestión | ✅ Operativo | ZonaDetalleModal (stats + mini mapa Leaflet); Concesión / Difunto / Tercero con modales |
| Flujo restos / exhumación | ✅ Operativo | Ver sección dedicada más abajo |
| Cuadrícula reactiva | ✅ Operativo | Nichos cambian de verde↔rojo al instante sin recargar la grid; transición animada 400ms |

### Flujo restos y exhumación (lógica clave)

| Acción | Resultado |
|--------|-----------|
| **Añadir difunto a nicho ocupado** | Los inhumados anteriores pasan automáticamente a `estado_inhumacion = 'restos'` (conservan `sepultura_id`). El nuevo difunto es el inhumado activo (`es_titular = true`). Controlado en `DifuntoAsignarController` y `WorkflowInhumacionController`. |
| **Botón "Exhumar"** en panel de sepultura | El difunto pasa a `estado_inhumacion = 'restos'` (conserva `sepultura_id`). El nicho pasa a `libre` (sin inhumados activos). El panel se recarga al instante. La cuadrícula de nichos cambia de rojo a verde automáticamente. |
| **Nicho con restos** | Estado `libre` — puede recibir nuevas inhumaciones. Los restos siguen visibles en la sección "Restos en el nicho" del panel con badge visual. |
| **Historial de movimientos** | Cargado por `sepultura_origen_id` (todos los movimientos del nicho, no solo del titular activo). Muestra nombre del difunto, tipo con color de dot y fecha. |

**Campos en `cemn_difuntos` (migración 2026-05-11):**
- `estado_inhumacion` — `'inhumado'` / `'restos'` (en nicho) / `'exhumado'` (fuera, `sepultura_id=null`)
- `fecha_exhumacion`, `documento_sanidad_path`, `motivo_exhumacion`

**Relación `CemnSepultura::difuntoTitular()`:** filtra `estado_inhumacion = 'inhumado'` → devuelve solo el activo.

### Reactividad de la cuadrícula de nichos

`SepulturaInfoPanel` emite `@changed { id, estado, nombre }` tras cada recarga. Los componentes padres actualizan la celda localmente:

| Componente | Qué actualiza al recibir `@changed` |
|---|---|
| `BloqueGridView.vue` | `sepulturas[i].estado` → celda cambia verde/rojo al instante |
| `BloqueGridModal.vue` | Ídem |
| `DashboardPage.vue` | `allSepulturas[i].estado` → el mapa Leaflet refleja el cambio |
| `CrudSepulturas.vue` | `items[i].estado` → columna Estado en la tabla |

La transición de color es animada (`background-color 400ms ease`) para que sea visualmente obvia.

### Sistema de usuarios y roles

- **Roles disponibles (Spatie):** `super_admin` (único activo; más se pueden crear con `php artisan permission:create-role <nombre>`)
- **Permisos del módulo:** `cementerio.ver`, `cementerio.crear`, `cementerio.editar`, `cementerio.admin`
- **Superadmin:** siempre pasa todos los permisos (lógica en `auth.js → hasPermission()`).
- **API usuarios:** `GET/POST /api/admin/users`, `PUT /api/admin/users/{id}`, `DELETE`, `PUT /roles`, `PUT /permissions` — requieren `cementerio.admin`.
- **Frontend:** `UsuariosPage.vue` — tabla con avatar, badges de roles/permisos, modal edición, modal roles+permisos. Solo visible en sidebar si `auth.hasPermission('cementerio.admin')`.

### Multi-cementerio

- **Store:** `resources/js/stores/cementerio.js` — carga lista de cementerios, persiste selección en `localStorage` (`cementerio_activo_id`).
- **Topbar:** dropdown selector aparece automáticamente cuando hay más de 1 cementerio en BD.
- **Todos los endpoints** de stats, geo, catálogo, admin (zonas/bloques/sepulturas) aceptan `?cementerio_id=N` como filtro opcional — sin el parámetro devuelven todo (backward compatible).
- **Frontend:** `DashboardPage`, `CrudZonas`, `CrudBloques`, `CrudSepulturas` pasan `cementerio_id` en cada llamada y tienen `watch(cid)` para recargar al cambiar.

### Cementerios en BD

| id | Nombre | Municipio | Tipo |
|----|--------|-----------|------|
| 1 | Cementerio Municipal de Somahoz | Los Corrales de Buelna | Producción (datos reales históricos) |
| 4 | Cementerio Municipal de Bárcena de Pie de Concha | Bárcena de Pie de Concha | Demo (creado con `CementerioDemoSeeder`) |

### Rutas frontend

| Ruta | Página |
|------|--------|
| `/login` | LoginPage |
| `/cementerio` | DashboardPage (Inicio) |
| `/cementerio/gestion` | GestionPage (tabs CRUD) |
| `/cementerio/nuevo` | NuevoCasoWizard |
| `/cementerio/regularizacion` | RegularizacionMasivaPage |
| `/cementerio/papelera` | PapeleraPage |
| `/cementerio/ayuda` | AyudaPage |
| `/cementerio/usuarios` | UsuariosPage (requiere `cementerio.admin`) |

### BD — estado de datos (2026-05-11 Sesión 2)

```
cemn_cementerios:         2  (Somahoz real + Bárcena demo)
cemn_zonas:              12  (4 de Somahoz + 2 Bárcena + historicas)
cemn_bloques:            17  (11 Somahoz + 5 Bárcena + pruebas)
cemn_sepulturas:        398  (224 Somahoz reales + 174 Bárcena demo)
cemn_terceros:          187  (históricos reales)
cemn_concesiones:        50  (1963-2025, históricas reales)
cemn_difuntos:          461  (históricos reales, sepultura_id=NULL pendiente)
cemn_settings:           26  (configuración de la app)
users:                    2  (admin + usuario de prueba)
```

### Pendientes de deuda técnica

La tabla siguiente resume deuda técnica; el detalle por funcionalidad (qué está ✅ y qué ⏳), estudios y doc del repo desfasada está en **[`docs/cosas-pendientes.md`](docs/cosas-pendientes.md)**.

1. **`sepultura_id` en difuntos/concesiones históricos** — usar `/cementerio/regularizacion` para asignar los ~458 difuntos y 50 concesiones históricas de Somahoz.
2. **`cemn_concesion_terceros`** — pivot vacío, pendiente repoblar desde detalle de tercero → Concesiones.
3. **Zonas sin polígono** — ZV y ZN de Somahoz sin `polygon`; trazar desde Gestión → Zonas → Editar.
4. **Warnings PrimeVue "Deprecated"** — Tabs/Select; no bloquean.
5. **`CementerioDemoSeeder` no es idempotente** — si se ejecuta dos veces crea duplicados; añadir guard `if (CemnCementerio::where('municipio','Bárcena...')->exists()) return;`.
6. **Stats multi-cementerio** — `CementerioStatsBloqueController`, `CementerioStatsZonaController`, `CementerioStatsTipoController` sin filtro `cementerio_id` (hoy asumen Somahoz si no se pasa nada coherente).
7. **Roles intermedios** — solo `super_admin` en uso; pendiente definir p. ej. `operario` / `consulta` con permisos reducidos.

### Comandos útiles (GestionCementerioApp)

```bash
php artisan migrate --force
php artisan db:seed --class=CemnSettingsSeeder --force
php artisan db:seed --class=CemeteryHistoricalDataSeeder --force
php artisan db:seed --class=CementerioDemoSeeder --force   # 2º cementerio demo
node node_modules/vite/bin/vite.js build
php artisan route:list --path=api/cementerio | wc -l       # contar rutas módulo
php artisan route:list --path=api/admin                    # rutas gestión usuarios
```

### Archivos clave a revisar

```
app/Http/Controllers/Cementerio/         # Todos los controladores del módulo
app/Http/Controllers/Admin/              # UsersAdminController (gestión usuarios)
app/Models/Cemn*.php                     # Modelos (CemnSepultura, CemnDifunto, etc.)
resources/js/pages/cementerio/           # Páginas Vue (incluye UsuariosPage.vue)
resources/js/components/cementerio/      # Componentes (SepulturaInfoPanel, etc.)
resources/js/stores/                     # alertas.js, settings.js, auth.js, cementerio.js
database/seeders/CemnSettingsSeeder.php
database/seeders/CementerioDemoSeeder.php
docs/devlog/DEVLOG_2026-04-16.md         # Historial completo de sesiones
docs/cosas-pendientes.md                 # Checklist hecho/pendiente (actualizar al cerrar tareas)
```

---

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
| **Cementerio** | **En desarrollo activo (standalone)** | App independiente en `/var/www/html`. Tablas `cemn_*`, permisos `cementerio.{ver,editar,admin}`. Ver sección "GestionCementerioApp" en este CLAUDE.md y `docs/devlog/DEVLOG_2026-04-16.md`. |
| Personal / Fichajes | En producción (v2) | BD `zktime`, lógica en `app/Http/Controllers/Personal/`, `app/Services/Personal/` |
| Citas DNI | En producción | Tablas `dni_*`, `DniController`, permisos `dni.ver` / `dni.editar` |
| Residuos | Planificado | `residuos_*` |
| Enseres | Planificado | `enseres_*` |
| Locales + licencias | Planificado | `locales_*`, `ep_licencia_*` |
| Notificaciones (módulo legado municipio) | Planificado | Distinto de la bandeja in-app ya implementada |

### Módulo Cementerio — referencia rápida para agentes AI

El módulo está implementado como app standalone en `/var/www/html`. Para trabajar en él:

1. **Devlog completo**: `docs/devlog/DEVLOG_2026-04-16.md` — historial día a día con decisiones técnicas, bugs resueltos y estado de la BD.
2. **Checklist hecho/pendiente**: `docs/cosas-pendientes.md` — mantener alineada con el devlog al cerrar tareas (incluye doc del repo desfasada).
3. **Convenciones clave**:
   - Controladores cementerio: `app/Http/Controllers/Cementerio/` y `Admin/`
   - Controladores admin global: `app/Http/Controllers/Admin/` (`UsersAdminController`)
   - Modelos: `app/Models/Cemn*.php` (prefijo `cemn_` en tablas)
   - Rutas cementerio: `routes/api.php` grupo `prefix('cementerio')` con `auth:sanctum`
   - Rutas admin usuarios: `routes/api.php` grupo `prefix('admin')` con `permission:cementerio.admin`
   - Páginas Vue: `resources/js/pages/cementerio/`
   - Componentes Vue: `resources/js/components/cementerio/` y `admin/`
   - Stores: `resources/js/stores/` (alertas.js, settings.js, auth.js, **cementerio.js**)
4. **Multi-cementerio**: el store `useCementerioStore()` expone `activoId` — todos los endpoints de listado aceptan `?cementerio_id=N`. Los componentes `CrudZonas`, `CrudBloques`, `CrudSepulturas` y `DashboardPage` tienen watcher sobre `cid` para recargarse al cambiar.
5. **Soft deletes activos** en `CemnDifunto`, `CemnConcesion`, `CemnTercero` — usar `withTrashed()` / `onlyTrashed()` si necesitas ver eliminados; el `delete()` normal es siempre soft.
6. **Settings**: leer ajustes con `CemnSetting::get('clave', 'default')` en backend; `useSettingsStore().get('clave', 'default')` en frontend.
7. **Build**: `node node_modules/vite/bin/vite.js build` (npx no tiene permisos en este entorno).
8. **Auth store helpers**: `auth.hasRole('super_admin')`, `auth.hasPermission('cementerio.admin')`, `auth.can('cementerio.ver')`. Superadmin siempre pasa todos los permisos.
9. **Coexistencia**: la app v1 sigue en paralelo; migración/importación legacy cuando se defina.

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
