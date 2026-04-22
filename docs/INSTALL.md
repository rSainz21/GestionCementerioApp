# Instalación local (Windows) — Cementerio Somahoz

Este repo está pensado para **desarrollo local con SQLite** y **producción con MySQL**, manteniendo migraciones agnósticas.

## Requisitos

- **PHP 8.2** (recomendado: Laragon en Windows)
- **Composer**
- **Node.js** (LTS) + npm

## Setup (dev con SQLite)

1) Instala dependencias backend:

```bash
composer install
```

2) Crea el `.env`:

```bash
copy .env.example .env
```

3) Crea la BD SQLite:

```bash
type nul > database\\database.sqlite
```

4) Genera la key y migra:

```bash
php artisan key:generate
php artisan migrate
```

5) Instala dependencias frontend y arranca Vite:

```bash
npm install
npm run dev
```

6) Arranca Laravel:

```bash
php artisan serve
```

## Producción (MySQL)

- Cambia en `.env`:
  - `DB_CONNECTION=mysql`
  - `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`
- Ejecuta:

```bash
php artisan migrate --force
```

