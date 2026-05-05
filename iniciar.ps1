# iniciar.ps1 — Levanta Cementerio Somahoz y lo abre en el navegador
# Ejecutar desde la raíz del proyecto: .\iniciar.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$PORT = 8182

# ── IP local en la red del ayuntamiento ──────────────────────────────────────
$LAN_IP = (Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -notlike "127.*" -and
                   $_.IPAddress -notlike "172.*" -and
                   $_.IPAddress -notlike "169.254.*" } |
    Select-Object -First 1).IPAddress

if (-not $LAN_IP) { $LAN_IP = "localhost" }

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Cementerio Somahoz" -ForegroundColor Cyan
Write-Host "  Tu IP en la red: $LAN_IP" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# ── Firewall: abrir puerto 8182 si no está abierto ───────────────────────────
$rule = Get-NetFirewallRule -DisplayName "Cementerio-8182" -ErrorAction SilentlyContinue
if (-not $rule) {
    Write-Host ""
    Write-Host "Abriendo puerto $PORT en el firewall de Windows..." -ForegroundColor Yellow
    try {
        New-NetFirewallRule -DisplayName "Cementerio-8182" `
            -Direction Inbound -Protocol TCP -LocalPort $PORT `
            -Action Allow -Profile Any | Out-Null
        Write-Host "  Puerto $PORT abierto OK" -ForegroundColor Green
    } catch {
        Write-Host "  No se pudo abrir el firewall automáticamente." -ForegroundColor Yellow
        Write-Host "  Si otros PCs no pueden acceder, ejecuta como Administrador." -ForegroundColor Yellow
    }
}

# ── Levantar contenedores ─────────────────────────────────────────────────────
Write-Host ""
Write-Host "Levantando contenedores Docker..." -ForegroundColor Yellow

$env:APP_PORT = $PORT
docker compose up -d --build 2>&1 | Where-Object { $_ -match "error|warn|built|start|creat|pull" -or $_ -match "^#" }

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR al levantar Docker. Comprueba que Docker Desktop esté en marcha." -ForegroundColor Red
    exit 1
}

# ── Esperar a MySQL ───────────────────────────────────────────────────────────
Write-Host ""
Write-Host "Esperando a la base de datos..." -ForegroundColor Yellow
$retries = 0
do {
    Start-Sleep -Seconds 3
    $retries++
    $result = docker exec gestioncementerioapp-mysql-1 mysqladmin ping -u root -proot --silent 2>&1
    if ($retries -gt 20) {
        Write-Host "  MySQL tardó demasiado. Revisa con: docker compose logs mysql" -ForegroundColor Red
        exit 1
    }
} while ($result -notmatch "mysqld is alive")
Write-Host "  Base de datos lista" -ForegroundColor Green

# ── Migraciones y seeders (solo si hacen falta) ──────────────────────────────
Write-Host ""
Write-Host "Comprobando base de datos..." -ForegroundColor Yellow

$users = docker exec gestioncementerioapp-app-1 php artisan tinker --execute="echo App\Models\User::count();" 2>&1
if ($users -notmatch "^[1-9]") {
    Write-Host "  Primera vez — ejecutando migraciones y datos iniciales..." -ForegroundColor Yellow
    docker exec gestioncementerioapp-app-1 php artisan migrate --force 2>&1 | Select-String "Migrat|Running|Nothing"
    docker exec gestioncementerioapp-app-1 php artisan db:seed --class=RolesAndPermissionsSeeder --force 2>&1 | Select-String "Seeding|Done"
    docker exec gestioncementerioapp-app-1 php artisan db:seed --class=AdminUserSeeder --force 2>&1 | Select-String "Seeding|Done"
    docker exec gestioncementerioapp-app-1 php artisan db:seed --class=CementerioSomahozSeeder --force 2>&1 | Select-String "Seeding|Done|inserting"
    Write-Host "  Datos cargados OK" -ForegroundColor Green
} else {
    Write-Host "  Base de datos ya tiene datos — no se sobreescribe" -ForegroundColor Green
}

# ── Storage link ─────────────────────────────────────────────────────────────
docker exec gestioncementerioapp-app-1 php artisan storage:link --force 2>&1 | Out-Null

# ── Resultado ─────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  LISTO — accede desde cualquier PC del ayunt." -ForegroundColor Green
Write-Host ""
Write-Host "  Desde ESTE equipo:" -ForegroundColor White
Write-Host "    http://localhost:$PORT" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Desde OTROS equipos de la red:" -ForegroundColor White
Write-Host "    http://${LAN_IP}:$PORT" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Login: admin / admin2026" -ForegroundColor White
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

# Abrir navegador en este equipo
Start-Process "http://localhost:$PORT"
