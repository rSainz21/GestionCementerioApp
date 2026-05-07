# Despliegue en red (producción) — Docker

Este documento deja el despliegue “LAN” listo para que **cualquier PC de la red** pueda usar la app con **BD persistente** y **fotos persistentes**.

## Qué incluye

- **MySQL persistente** (`mysql_data`)
- **Storage persistente** (`app_storage`) para fotos en `storage/app/public`
- **Assets compilados** (Vite build) servidos desde `public/build` (sin `public/hot`)
- Arranque con:
  - `php artisan storage:link`
  - `php artisan migrate --force` (con reintentos)

## Puesta en marcha (PowerShell)

En la raíz del repo:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\prod-deploy.ps1 `
  -AppUrl "http://IP_DEL_SERVIDOR:8000" `
  -DbPassword "CAMBIA_ESTO" `
  -DbRootPassword "CAMBIA_ESTO_TAMBIEN" `
  -AppPort 8000 `
  -SeedDemo
```

- Quita `-SeedDemo` si no quieres datos demo.
- El script crea `.env` si no existe (desde `.env.prod.example`) y genera `APP_KEY` si está vacía.

## Comandos útiles

```powershell
# Levantar / parar
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml down

# Ver logs
docker compose -f docker-compose.prod.yml logs -f --tail 200 app
docker compose -f docker-compose.prod.yml logs -f --tail 200 nginx
docker compose -f docker-compose.prod.yml logs -f --tail 200 mysql

# Entrar a artisan
docker compose -f docker-compose.prod.yml exec app php artisan about
```

## phpMyAdmin (solo si hace falta)

Está bajo el profile `admin`:

```powershell
docker compose -f docker-compose.prod.yml --profile admin up -d
```

Recomendación: en producción **restringir por IP** o no levantar este profile.

## Backups (imprescindible)

Dump manual:

```powershell
docker compose -f docker-compose.prod.yml exec mysql mysqldump -u root -p cementerio > backup_cementerio.sql
```

Programa una tarea diaria y copia el backup a una ubicación corporativa (NAS).

