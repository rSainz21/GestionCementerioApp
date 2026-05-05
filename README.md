# Conect@ 2.0 — Módulo Cementerio (Portfolio)

[![CI](../../actions/workflows/ci.yml/badge.svg)](../../actions/workflows/ci.yml)
![Laravel](https://img.shields.io/badge/Laravel-12-red)
![Vue](https://img.shields.io/badge/Vue-3-42b883)
![Expo](https://img.shields.io/badge/Expo-54-black)

Repositorio **full‑stack** (API + Web + App de campo) orientado a portfolio: arquitectura, UX y operación real en un módulo municipal de cementerio.

> **Importante**: repo sin credenciales reales. Checklist de publicación en `docs/portfolio/SEGURIDAD_Y_PRIVACIDAD.md`.

## Qué es (1 minuto)

Sistema para gestión de cementerio con foco operativo:

- **Inventario** de unidades, zonas y bloques.
- **Concesiones** (expedientes) y titulares.
- **Difuntos** vinculados a unidades.
- **Documentos/Fotos** como evidencias.
- **App de campo** con mapa + ficha y soporte offline (cola + sincronización).

## Stack

- **Backend**: Laravel 12 · PHP 8.2 · Sanctum (Bearer) · Spatie permissions · DomPDF
- **Web**: Vue 3 · Vite · PrimeVue (Aura) · Pinia · Vue Router
- **App**: Expo / React Native · Expo Router · Leaflet (web) · RN Maps (nativo)
- **DB**: SQLite (dev) / MySQL (prod)
- **Ops**: Docker Compose (despliegue LAN)

## Ruta rápida para evaluarlo

- **Resumen ejecutivo**: `docs/portfolio/RESUMEN_PARA_EMPRESAS.md`
- **Arquitectura**: `docs/portfolio/ARQUITECTURA.md`
- **Features**: `docs/portfolio/FEATURES.md`
- **Demo local**: `docs/portfolio/COMO_EJECUTAR_DEMO.md`
- **Mi aportación**: `docs/portfolio/MI_APORTACION.md`

## Estructura del repo

- `app/`, `routes/`, `database/`: API Laravel
- `resources/js/`: Web (Vue)
- `cementerio-app/`: App Expo (campo)
- `mobile-apk/`: wrapper APK (opcional)
- `docs/portfolio/`: documentación de portfolio

## Quickstart (dev)

### Backend + Web

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed

npm install
npm run dev
```

### App de campo

```bash
cd cementerio-app
cp .env.example .env
# EXPO_PUBLIC_LARAVEL_BASE=http://TU_HOST:8000
npm install
npm run start
```

## Licencia

MIT. Ver `LICENSE`.
