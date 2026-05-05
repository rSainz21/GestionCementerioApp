# Cómo ejecutar una demo (local)

> Objetivo: que una empresa pueda levantar el proyecto con datos demo sin depender de infraestructura privada.

## Backend (Laravel)

1) Instala dependencias:

- `composer install`

2) Crea `.env` desde `.env.example` y genera key:

- `php artisan key:generate`

3) Base de datos (dev, SQLite):

- crea `database/database.sqlite`
- `php artisan migrate --seed`

4) Arranca:

- `php artisan serve`

## Web (Vue)

1) Instala:

- `npm install`

2) Dev server:

- `npm run dev`

## App de campo (Expo)

En `cementerio-app/`:

1) Instala:

- `npm install`

2) Configura `.env` desde `cementerio-app/.env.example` (pon tu base local):

- `EXPO_PUBLIC_LARAVEL_BASE=http://TU_IP_LOCAL:8000`

3) Arranca:

- `npm run start`

## Despliegue LAN (Docker)

Si quieres mostrar despliegue reproducible:

- ver `docs/DEPLOY_PROD.md`

