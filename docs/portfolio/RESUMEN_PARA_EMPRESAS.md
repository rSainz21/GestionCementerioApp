# Resumen para empresas (1–2 min)

## Qué es

**Conect@ 2.0 — Cementerio** es un módulo de gestión municipal para:

- **Inventario** de unidades (nichos/sepulturas/panteones), zonas y bloques.
- **Concesiones** (expedientes), titulares y estado de vigencia.
- **Difuntos** vinculados a unidades.
- **Operaciones**: inhumación, exhumación/traslado, adjuntar evidencias (documento/foto), auditoría de cambios.

Incluye dos productos:

- **Web de gestión** (Vue + PrimeVue) para administración y datos base.
- **App de campo** (Expo/React Native) para uso operativo en cementerio: mapa, ficha de unidad, acciones rápidas y soporte offline.

## Qué aporta técnicamente

- **API Laravel** con validaciones, permisos, endpoints de búsqueda, subida de documentos/fotos y auditoría.
- **Frontend Web** con layout propio y UI consistente sobre PrimeVue (preset Aura).
- **App móvil** con flujos táctiles, experiencia robusta (loading/error/empty), y sincronización diferida (cola offline).
- **Despliegue reproducible** con Docker (BD persistente + storage persistente).

## Tecnologías

- **Laravel 12 + PHP 8.2**
- **Vue 3 + Vite + PrimeVue**
- **Expo / React Native**
- **MySQL** (prod) / SQLite (dev)
- **Docker Compose** para despliegue LAN

## Qué mirar para evaluar

- Arquitectura: `ARQUITECTURA.md`
- Demo local: `COMO_EJECUTAR_DEMO.md`
- Feature list: `FEATURES.md`
- Privacidad: `SEGURIDAD_Y_PRIVACIDAD.md`

