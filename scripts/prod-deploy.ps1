param(
  [string]$AppUrl = "http://localhost:8000",
  [string]$DbPassword = "cementerio",
  [string]$DbRootPassword = "root",
  [int]$AppPort = 8000,
  [switch]$SeedDemo
)

$ErrorActionPreference = "Stop"

function Assert-Ok($LASTEXITCODE, [string]$step) {
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Fallo en: $step (exit=$LASTEXITCODE)" -ForegroundColor Red
    exit $LASTEXITCODE
  }
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host "Docker no está disponible. Instala Docker Desktop y reintenta." -ForegroundColor Red
  exit 1
}

$compose = "docker compose -f docker-compose.prod.yml"

Write-Host "== Despliegue PROD (LAN) ==" -ForegroundColor Cyan

if (-not (Test-Path ".\.env")) {
  if (Test-Path ".\.env.prod.example") {
    Copy-Item ".\.env.prod.example" ".\.env"
    Write-Host "Creado .env desde .env.prod.example" -ForegroundColor Yellow
  } elseif (Test-Path ".\.env.example") {
    Copy-Item ".\.env.example" ".\.env"
    Write-Host "Creado .env desde .env.example (ajústalo a producción)" -ForegroundColor Yellow
  } else {
    Write-Host "No existe .env.example. No puedo crear .env automáticamente." -ForegroundColor Red
    exit 1
  }
}

# Ajustes mínimos (APP_URL + passwords) para el stack prod
$envContent = Get-Content ".\.env" -Raw
if ($envContent -notmatch "^APP_URL=") { $envContent += "`nAPP_URL=$AppUrl`n" }
$envContent = ($envContent -replace "(?m)^APP_URL=.*$", "APP_URL=$AppUrl")

# Forzar flags de producción (la imagen ya está en modo prod; el .env debe acompañar)
if ($envContent -notmatch "^APP_ENV=") { $envContent += "`nAPP_ENV=production`n" }
$envContent = ($envContent -replace "(?m)^APP_ENV=.*$", "APP_ENV=production")

if ($envContent -notmatch "^APP_DEBUG=") { $envContent += "`nAPP_DEBUG=false`n" }
$envContent = ($envContent -replace "(?m)^APP_DEBUG=.*$", "APP_DEBUG=false")

if ($envContent -notmatch "^DB_PASSWORD=") { $envContent += "`nDB_PASSWORD=$DbPassword`n" }
$envContent = ($envContent -replace "(?m)^DB_PASSWORD=.*$", "DB_PASSWORD=$DbPassword")

if ($envContent -notmatch "^DB_ROOT_PASSWORD=") { $envContent += "`nDB_ROOT_PASSWORD=$DbRootPassword`n" }
$envContent = ($envContent -replace "(?m)^DB_ROOT_PASSWORD=.*$", "DB_ROOT_PASSWORD=$DbRootPassword")

Set-Content ".\.env" $envContent -Encoding UTF8

$env:APP_PORT = "$AppPort"

Write-Host "Construyendo y arrancando contenedores..." -ForegroundColor Cyan
Invoke-Expression "$compose up -d --build"
Assert-Ok $LASTEXITCODE "docker compose up -d --build"

# Generar APP_KEY si está vacía
$envContent2 = Get-Content ".\.env" -Raw
if ($envContent2 -match "(?m)^APP_KEY=\s*$") {
  Write-Host "Generando APP_KEY..." -ForegroundColor Cyan
  $appKey = Invoke-Expression "$compose run --rm app php artisan key:generate --show"
  Assert-Ok $LASTEXITCODE "php artisan key:generate --show"
  $envContent2 = ($envContent2 -replace "(?m)^APP_KEY=.*$", "APP_KEY=$appKey")
  Set-Content ".\.env" $envContent2 -Encoding UTF8

  # Reiniciar app para que coja la APP_KEY
  Invoke-Expression "$compose up -d --no-deps --force-recreate app"
  Assert-Ok $LASTEXITCODE "recreate app"
}

# Asegurar login (roles/permisos + usuario admin) aunque no se cargue demo
Write-Host "Asegurando usuario admin y permisos..." -ForegroundColor Cyan
Invoke-Expression "$compose exec app php artisan db:seed --class=RolesAndPermissionsSeeder --force"
Assert-Ok $LASTEXITCODE "seed RolesAndPermissionsSeeder"
Invoke-Expression "$compose exec app php artisan db:seed --class=AdminUserSeeder --force"
Assert-Ok $LASTEXITCODE "seed AdminUserSeeder"

if ($SeedDemo) {
  Write-Host "Ejecutando seed demo (Somahoz + admin)..." -ForegroundColor Yellow
  Invoke-Expression "$compose exec app php artisan db:seed --class=CementerioSomahozSeeder --force"
  Assert-Ok $LASTEXITCODE "seed CementerioSomahozSeeder"
}

Write-Host "OK. Abre: $AppUrl" -ForegroundColor Green
Write-Host "Nota: en producción, cambia credenciales por defecto y restringe phpMyAdmin." -ForegroundColor Green

