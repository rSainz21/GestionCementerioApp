# Cosas pendientes — GestionCementerioApp

> Documento de trabajo para registrar funcionalidades pendientes, mejoras y estudios abiertos.  
> **Última revisión de estados:** 2026-05-13 (alineado con `CLAUDE.md` y `docs/devlog/DEVLOG_2026-04-16.md`).

### Leyenda

| Marca | Significado |
|-------|-------------|
| ✅ **Hecho** | Implementado en código / UI según el contexto actual del repo. |
| ⏳ **Pendiente** | Falta trabajo de producto, UX, datos o código. |
| 🔧 **Operativo** | La herramienta existe; queda **ejecutar** la tarea (datos, despliegue, decisión). |
| 📋 **Estudio** | Decisión o diseño previo, sin implementación acordada. |
| 🔮 **Futuro** | Bloqueado por confirmación externa (ayuntamiento / facturación). |

---

## Resumen rápido — deuda técnica transversal (Devlog 2026-05-11)

| Ítem | Estado |
|------|--------|
| Asignar `sepultura_id` a difuntos/concesiones históricas (Somahoz) vía `/cementerio/regularizacion` | 🔧 Operativo (UI lista; falta completar datos) |
| Repoblar pivot `cemn_concesion_terceros` | ⏳ Pendiente |
| Zonas Somahoz sin polígono (p. ej. ZV, ZN) | ⏳ Pendiente (trazar en Gestión → Zonas) |
| Migrar warnings PrimeVue Deprecated (Tabs/Select) | ⏳ Pendiente (no bloquea) |
| `CementerioDemoSeeder` idempotente (guard anti-duplicados) | ⏳ Pendiente |
| Filtro `cementerio_id` en stats (`StatsBloque`, `StatsZona`, `StatsTipo`) | ⏳ Pendiente |
| Roles intermedios (`operario`, `consulta`, …) además de `super_admin` | ⏳ Pendiente |

---

## 1. Gestión — Redirecciones y vistas de detalle

**Estado global:** ✅ **Hecho** (modales / panel desde tabs CRUD; revisar solo si se quiere una “vista página” en lugar de modal).

| Elemento | Estado | Notas |
|----------|--------|--------|
| **Zona** → ficha con polígono, bloques, stats | ✅ Hecho | `ZonaDetalleModal.vue` desde `CrudZonas.vue`. |
| **Bloque** → zona, cuadrícula de sepulturas | ✅ Hecho | `BloqueGridView` desde `CrudBloques.vue` (grid del bloque). |
| **Sepultura** → expediente digital | ✅ Hecho | `SepulturaInfoPanel` en `CrudSepulturas.vue`. |
| **Concesión** → titular, fechas, difuntos | ✅ Hecho | `ConcesionDetalleModal` en `CrudConcesiones.vue` / terceros. |
| **Difunto** → ficha, sepultura, concesiones | ✅ Hecho | `DifuntoDetalleModal` en `CrudDifuntos.vue`. |
| **Tercero** → ficha y concesiones | ✅ Hecho | `TerceroDetalleModal` + concesiones en `CrudTerceros.vue`. |

⏳ **Opcional:** unificar criterio “siempre modal” vs “ruta dedicada `/cementerio/.../id`” si en algún momento se exige URL compartible para cada entidad.

---

## 2. Sistema de alertas — Pulir y ampliar

**Estado global:** ✅ **Mayormente hecho** — sidebar con grupos (caducadas, próximas, difuntos sin ubicar, concesiones sin nicho); umbrales `dias_aviso_vencimiento` y `dias_urgencia` leídos desde `cemn_settings` / `AlertasController`.

| Ítem | Estado | Notas |
|------|--------|--------|
| Umbral “próxima a caducar” configurable | ✅ Hecho | Ajustes en panel Configuración (grupo alertas). |
| Concesiones caducadas | ✅ Hecho | Grupo en sidebar. |
| Difuntos sin `sepultura_id` | ✅ Hecho | Alerta + página regularización. |
| Concesiones sin nicho / placeholder | ✅ Hecho | Alerta + regularización. |
| Nuevas alertas (documentación incompleta, estados inconsistentes, etc.) | ⏳ Pendiente | Solo si negocio lo prioriza. |
| Pulir UX (textos, orden, badges, rendimiento) | ⏳ Pendiente | Mejora continua. |

---

## 3. Configuración — Ajustes por defecto ampliados

**Estado global:** ✅ **Mayormente hecho** — panel drawer, grupos en BD, CSS en vivo, backup, sistema.

| Ítem | Estado | Notas |
|------|--------|--------|
| Días de aviso caducidad / urgencia | ✅ Hecho | En settings + uso en alertas. |
| Duración por defecto concesión | ✅ Hecho | Setting `duracion_concesion_defecto` (ej. 50 años en devlog 2026-05-11). |
| Selector explícito 5 / 10 / 15 / 20 / 50 / perpetua en UI de creación | ⏳ Revisar | Confirmar en formularios si todas las opciones están enlazadas al setting. |
| Más ajustes operativos | ⏳ Pendiente | Ir añadiendo según necesidad (registrar aquí). |

---

## 4. Terceros vs Difuntos — Estudio de unificación

**Estado:** 📋 **Estudio** — sin decisión ni migración acordada.

- Mantener `cemn_terceros` vs tabla unificada / fusión con `cemn_difuntos`.
- Impacto en `cemn_concesion_terceros` y relaciones.

---

## 5. Mapa — Crear zona/bloque desde el mapa + pantalla completa

**Estado:** ✅ **Hecho** — toolbar en dashboard: “Nueva zona”, “Nuevo bloque” (`ZonaFormDialog` / `BloqueFormDialog` compartidos con Gestión) y “Pantalla completa”.

---

## 6. Buscador global

**Estado:** ✅ **Hecho** — topbar (lupa + atajo `/`), resultados agrupados (sepulturas, difuntos, concesiones, terceros).

---

## 7. (Numeración) — Regularización masiva de datos

**Estado:** ✅ **Hecho** (herramienta) / 🔧 **Operativo** (datos Somahoz).

- Página `/cementerio/regularizacion`, tabs difuntos/concesiones, `SepulturaSearchInline`.
- ⏳ / 🔧 Completar asignación masiva real en producción hasta dejar históricos consistentes.

---

## 8. Renovación de concesiones

**Estado:** ✅ **Hecho** — “Renovar” en `ConcesionDetalleModal`, formulario, historial/timeline.

| Ítem | Estado | Notas |
|------|--------|--------|
| Renovar desde detalle | ✅ Hecho | |
| Desde listado global de concesiones | ⏳ Revisar | Si el listado no expone el mismo botón, alinear UX. |
| Modelo “nueva fila vs actualización in situ” | ✅ Decidido en código | Ver comportamiento actual en backend; documentar en ayuda si hace falta. |

---

## 9. Exhumación y enterramiento sobre nicho ocupado

**Estado:** ✅ **Hecho** — `estado_inhumacion` (`inhumado` / `restos` / `exhumado`), documento de sanidad, fechas, `WorkflowExhumacionController`, `ExhumacionModal`, inhumación nueva pasando anteriores a `restos` (`DifuntoAsignarController` / `WorkflowInhumacionController`), historial por nicho.

⏳ **Pulir:** textos legales/ayuda, validaciones estrictas de obligatoriedad del documento de sanidad si negocio lo exige (hoy puede ser opcional según flujo simplificado del modal).

---

## 10. [Futuro — confirmación ayuntamiento] Cálculo de coste de concesión

**Estado:** 🔮 **Futuro** — requiere modelo de tarifas y decisión sobre facturación.

- Tabla tipo `cemn_tarifas`, integración con wizard/renovación/PDF, etc.

---

## Documentación del repo (no es backlog de producto, pero confunde)

| Fichero | Problema | Acción sugerida |
|---------|----------|-----------------|
| `README.md` (raíz) | Describe stack Java/Spring Boot; el proyecto es Laravel + Vue. | ⏳ Actualizar o sustituir por README real del cementerio. |
| `docs/INSTALL.md` | Habla de SQLite en dev; entorno actual documentado en `CLAUDE.md` usa MariaDB. | ⏳ Alinear instrucciones con el `.env` real del equipo. |

---

## Cómo mantener este documento

1. Al cerrar un tema, cambiar el estado a ✅ y una línea de referencia (PR, fecha devlog, componente).
2. Los ítems nuevos de deuda técnica: añadirlos al **Resumen rápido** y reflejarlos en `CLAUDE.md` cuando cierre un sprint relevante.
