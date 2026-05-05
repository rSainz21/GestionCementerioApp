# =============================================================================
# deploy-to-server.ps1
# Empaqueta la app, la sube al servidor y lanza el setup automático.
#
# REQUISITOS PREVIOS:
#   1. El stack Portainer ya está corriendo (cementerio_php en puerto 2224)
#   2. OpenSSH instalado en Windows (viene con Win10/11)
#   3. Ejecutar desde la raíz del proyecto
#
# USO:
#   .\scripts\deploy-to-server.ps1
#   .\scripts\deploy-to-server.ps1 -ServerIP 10.10.20.31 -SSHUser root -SSHPort 2224
# =============================================================================

param(
    [string]$ServerIP  = "10.10.20.31",
    [string]$SSHUser   = "conecta",
    [int]   $SSHPort   = 2224,
    [switch]$SkipBuild = $false
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Deploy Cementerio Somahoz → $ServerIP`:$SSHPort" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

Set-Location $ProjectRoot

# ── 1. Build assets ───────────────────────────────────────────────────────────
if (-not $SkipBuild) {
    Write-Host ""
    Write-Host "[1/4] Compilando assets Vite..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) { Write-Error "npm run build falló"; exit 1 }
    Write-Host "  Assets compilados OK" -ForegroundColor Green
} else {
    Write-Host "[1/4] Build omitido (-SkipBuild)" -ForegroundColor DarkGray
}

# ── 2. Empaquetar ─────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[2/4] Empaquetando proyecto..." -ForegroundColor Yellow

$TarFile = "$env:TEMP\cementerio_deploy.tar.gz"

# Exclusiones: node_modules, .git, tests, capturas, etc.
$Excludes = @(
    "--exclude=./node_modules",
    "--exclude=./.git",
    "--exclude=./storage/logs",
    "--exclude=./storage/framework/cache",
    "--exclude=./storage/framework/sessions",
    "--exclude=./storage/framework/views",
    "--exclude=./scripts/qa/screenshots",
    "--exclude=./.env",
    "--exclude=./docker-compose.yml",
    "--exclude=./docker-compose.prod.yml"
)

# Usa tar de Git Bash / WSL si está disponible, si no usa PowerShell Compress
$TarCmd = Get-Command tar -ErrorAction SilentlyContinue
if ($TarCmd) {
    $ExcludeArgs = $Excludes -join " "
    $TarArgs = "czf `"$TarFile`" $ExcludeArgs -C `"$ProjectRoot`" ."
    cmd /c "tar $TarArgs"
} else {
    Write-Error "tar no encontrado. Instala Git para Windows o habilita WSL."
    exit 1
}

$SizeMB = [math]::Round((Get-Item $TarFile).Length / 1MB, 1)
Write-Host "  Paquete creado: $TarFile ($SizeMB MB)" -ForegroundColor Green

# ── 3. Subir al servidor ──────────────────────────────────────────────────────
Write-Host ""
Write-Host "[3/4] Subiendo al servidor (SCP)..." -ForegroundColor Yellow
Write-Host "  → Se te pedirá la contraseña SSH del contenedor"

scp -P $SSHPort -o StrictHostKeyChecking=accept-new `
    "$TarFile" `
    "${SSHUser}@${ServerIP}:/tmp/cementerio.tar.gz"

if ($LASTEXITCODE -ne 0) { Write-Error "SCP falló"; exit 1 }
Write-Host "  Paquete subido OK" -ForegroundColor Green

# Subir también el script de setup
scp -P $SSHPort -o StrictHostKeyChecking=accept-new `
    "$ProjectRoot\scripts\setup-contenedor.sh" `
    "${SSHUser}@${ServerIP}:/tmp/setup-contenedor.sh"

Write-Host "  Script de setup subido OK" -ForegroundColor Green

# ── 4. Ejecutar setup en el contenedor ───────────────────────────────────────
Write-Host ""
Write-Host "[4/4] Ejecutando setup en el contenedor..." -ForegroundColor Yellow
Write-Host "  → Se te pedirá la contraseña SSH de nuevo"
Write-Host "  → Cuando pregunte por datos demo, responde 's' o 'n'"
Write-Host ""

ssh -p $SSHPort -o StrictHostKeyChecking=accept-new `
    "${SSHUser}@${ServerIP}" `
    "chmod +x /tmp/setup-contenedor.sh && bash /tmp/setup-contenedor.sh"

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "El setup remoto devolvió error. Revisa los mensajes arriba." -ForegroundColor Red
    Write-Host "Puedes entrar manualmente: ssh -p $SSHPort ${SSHUser}@${ServerIP}" -ForegroundColor Yellow
    exit 1
}

# ── Resultado ─────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  DESPLIEGUE COMPLETADO" -ForegroundColor Green
Write-Host "  http://${ServerIP}:8182" -ForegroundColor Green
Write-Host "  Login: admin / admin2026" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

# Limpiar tar temporal
Remove-Item $TarFile -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Abre el navegador: http://${ServerIP}:8182" -ForegroundColor Cyan
Start-Process "http://${ServerIP}:8182"
