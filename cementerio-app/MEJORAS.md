# 📋 Diagnóstico y Plan de Mejoras — App Cementerio Somahoz

## Fase 1 — Diagnóstico

### Resumen ejecutivo
La app móvil (Expo/React Native) para gestión del cementerio de Somahoz presenta una base sólida:
autenticación funcional con Laravel (Sanctum), navegación por tabs, mapa interactivo con hotspots/ortofoto,
grid de nichos con gestión de estados, y flujos operativos (GPS, NFC, PDF, cámara).
Sin embargo, hay oportunidades claras de mejora en UX, robustez de red, consistencia visual y mantenibilidad.

### Problemas detectados

#### A) UX/UI
| # | Problema | Impacto | Archivo(s) |
|---|---------|---------|-----------|
| 1 | Login sin toggle de visibilidad de contraseña | Fricción en campo | `app/login.tsx` |
| 2 | Dashboard estático (saludo fijo "Buenos días") | No adapta hora del día | `app/(tabs)/inicio.tsx` |
| 3 | Sin pull-to-refresh en pantallas clave | Operario debe salir/volver para refrescar | `inicio.tsx`, `campo.tsx` |
| 4 | Búsqueda sin estado vacío visual atractivo | UX fría al abrir | `app/buscar.tsx` |
| 5 | Feedback de errores solo por Alert() | Bloquea al operario | Global |
| 6 | "Más" screen con estilo inconsistente (#F8FAFC vs #F3EFE6) | Incoherencia visual | `app/(tabs)/mas.tsx` |
| 7 | Sin indicador de estado de red visible | Operario no sabe si hay conexión | Global |

#### B) Robustez técnica
| # | Problema | Impacto |
|---|---------|---------|
| 1 | Sin retry automático en fallos de red | Operaciones perdidas en campo |
| 2 | apiFetch no emite eventos de red | No se puede mostrar banner offline |
| 3 | Tipado `any` extenso en auth-context.tsx (user: any) | Dificulta refactors |
| 4 | sepultura/[id].tsx con 1500+ líneas | Difícil de mantener |
| 5 | Colores hardcodeados en estilos (no tokens) | Inconsistencia |

#### C) Mapa
| # | Problema | Impacto |
|---|---------|---------|
| 1 | Botones float sin labels | Difícil saber función |
| 2 | Sin capa de filtros por estado | Operario no filtra visualmente |
| 3 | "Capas" y "Columbarios" son placeholders | Funcionalidad incompleta |

### Fortalezas identificadas
- ✅ Design system consistente (AppButton, AppCard, AppPill, tokens)
- ✅ Offline queue (auditoria-queue.ts) bien implementada
- ✅ GPS estricto (<5m), foto obligatoria en cambios de estado
- ✅ NFC, STT (dictado), PDF generation
- ✅ Web parity (.web.tsx)
- ✅ Gesture handler + Reanimated para mapas

---

## Fase 2 — Quick Wins (implementados)

### Cambios realizados

| Bloque | Archivos | Qué |
|--------|---------|-----|
| Design tokens | `constants/Colors.ts`, `constants/Theme.ts` | Tokens semánticos completos, Spacing, nuevos Shadows |
| Toast system | `components/ui/AppToast.tsx`, `lib/toast-context.tsx` | Sistema de feedback no bloqueante (success/error/warning/info) |
| Network status | `lib/useNetworkStatus.ts` | Hook reactivo + banner offline automático |
| Login mejorado | `app/login.tsx` | Toggle contraseña, mejor validación, feedback toast |
| Dashboard mejorado | `app/(tabs)/inicio.tsx` | Saludo por hora, pull-to-refresh, acciones rápidas mejoradas |
| Búsqueda mejorada | `app/buscar.tsx` | ScrollView, mejor empty state, UX pulida |
| Pantalla "Más" | `app/(tabs)/mas.tsx` | Estilo consistente con resto de app |
| API resiliente | `lib/laravel-api.ts` | Retry automático en errores de red, evento de estado |
| UI barrel | `components/ui/index.ts` | Exporta nuevos componentes |

### Riesgos y trade-offs
- **Compatibilidad backend**: No se modificó ningún endpoint ni payload. Solo cambios en frontend.
- **Toast vs Alert**: Se mantienen Alerts para acciones destructivas, Toast para feedback informativo.
- **NetInfo**: Ya estaba en package.json, se aprovecha sin instalar dependencias nuevas.

### Plan de pruebas manuales

1. **Login**: Verificar toggle ojo, error con credenciales inválidas muestra toast, login exitoso redirige.
2. **Dashboard**: Pull-to-refresh recarga stats, saludo cambia según hora, accesos rápidos navegan correctamente.
3. **Búsqueda**: Escribir >=2 chars muestra resultados, empty state visible, tabs difuntos/concesiones funcionan.
4. **Offline**: Desactivar red → aparece banner "Sin conexión", reactivar → desaparece.
5. **Más**: Estilo visual consistente, cerrar sesión funciona, navegación a todas las opciones.

---

## Fases futuras

### Fase 3 — Mapa y funcionalidades críticas
- Implementar selector de capas (filtro por estado en mapa)
- Mejorar interacción de zoom/selección en PlanoGeneralMapa
- Añadir búsqueda rápida desde mapa con autocompletado
- Optimizar renderizado SVG para dispositivos modestos

### Fase 4 — Hardening técnico
- Extraer secciones de sepultura/[id].tsx en componentes (tabs)
- Tipar user en auth-context (interface User)
- Tests unitarios para utils (estado-sepultura, normalize, etc.)
- Centralizar todos los colores hardcodeados a tokens
- i18n preparation
