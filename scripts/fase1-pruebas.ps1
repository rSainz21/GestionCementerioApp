param(
  [switch]$Fresh,
  [switch]$WipeDb,
  [switch]$SeedDemo
)

$ErrorActionPreference = "Stop"

function Require-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Falta '$name' en PATH. Instálalo y reintenta."
  }
}

Require-Command docker

Write-Host "== FASE 1: Backend (Docker prod estable) ==" -ForegroundColor Cyan

if ($Fresh) {
  Write-Host "Bajando contenedores..." -ForegroundColor Yellow
  if ($WipeDb) {
    Write-Host "WipeDb activado: se borrarán volúmenes (incluye MySQL persistente)." -ForegroundColor Red
    docker compose -f docker-compose.prod.yml down -v
  } else {
    docker compose -f docker-compose.prod.yml down
  }
}

Write-Host "Construyendo y levantando servicios..." -ForegroundColor Yellow
docker compose -f docker-compose.prod.yml up -d --build

Write-Host "Esperando a que el contenedor app esté listo..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "Migrando BD..." -ForegroundColor Yellow
docker compose -f docker-compose.prod.yml exec -T app php artisan migrate --force

Write-Host "Seed roles/permisos + admin..." -ForegroundColor Yellow
docker compose -f docker-compose.prod.yml exec -T app php artisan db:seed --class=RolesAndPermissionsSeeder --force
docker compose -f docker-compose.prod.yml exec -T app php artisan db:seed --class=AdminUserSeeder --force

if ($SeedDemo) {
  Write-Host "Seed DEMO Somahoz (datos de ejemplo)..." -ForegroundColor Yellow
  docker compose -f docker-compose.prod.yml exec -T app php artisan db:seed --class=CementerioSomahozSeeder --force
}

Write-Host ""
Write-Host "Backend OK." -ForegroundColor Green
Write-Host "URL: http://localhost:8000" -ForegroundColor Green
Write-Host "Nota móvil (futuro): si se vuelve a incorporar una app móvil, debería consumir el backend por LAN (p. ej. http://<TU-IP>:8000) y/o la API HTTP /mysql-api (si se mantiene)." -ForegroundColor Green
Write-Host "Credenciales: admin / admin2026" -ForegroundColor Green
Write-Host ""
Write-Host "== FASE 1: Móvil ==" -ForegroundColor Cyan
Write-Host "Esta rama es SOLO WEB. La carpeta 'cementerio-app/' no se incluye aquí por estar desactualizada." -ForegroundColor Yellow
Write-Host "Para móvil, revisar 'docs/MOVIL.md' (mysql-api + proxy /mysql-api/)." -ForegroundColor Yellow

