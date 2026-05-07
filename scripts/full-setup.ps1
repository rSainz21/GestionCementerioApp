param(
  [switch]$Fresh
)

$ErrorActionPreference = "Stop"

Write-Host "== Cementerio Somahoz: instalación completa ==" -ForegroundColor Cyan

function Assert-Ok($LASTEXITCODE, [string]$step) {
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Fallo en: $step (exit=$LASTEXITCODE)" -ForegroundColor Red
    exit $LASTEXITCODE
  }
}

function Find-Exe([string]$name, [string[]]$fallbackPaths) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  foreach ($p in $fallbackPaths) {
    if (Test-Path $p) { return $p }
  }
  return $null
}

# Intentar localizar PHP (Laragon suele instalar en C:\laragon)
$phpCandidates = @()
$phpCandidates += (Get-ChildItem "C:\\laragon\\bin\\php" -ErrorAction SilentlyContinue | ForEach-Object { Join-Path $_.FullName "php.exe" })
$phpCandidates += @("C:\\laragon\\bin\\php\\php.exe")
$php = Find-Exe "php" $phpCandidates
if (-not $php) {
  Write-Host "PHP no está disponible. Si instalaste Laragon, abre 'Laragon Terminal' o añade PHP al PATH y reintenta." -ForegroundColor Red
  exit 1
}

# Comprobar OpenSSL (necesario para composer por HTTPS)
$hasOpenSsl = $false
try {
  $mods = & $php -m 2>$null
  $hasOpenSsl = ($mods -match "^openssl$") -or ($mods -match "openssl")
} catch {
  $hasOpenSsl = $false
}
if (-not $hasOpenSsl) {
  Write-Host "Tu PHP no tiene OpenSSL habilitado. Composer no puede descargar dependencias por HTTPS." -ForegroundColor Red
  Write-Host "Solución (Laragon): Menu > PHP > php.ini y descomenta: extension=openssl" -ForegroundColor Yellow
  Write-Host "Luego reinicia Laragon y vuelve a ejecutar este script." -ForegroundColor Yellow
  exit 1
}

# Composer (instalador oficial suele colocar composer.bat en System32 o en ProgramData)
$composerCandidates = @(
  "C:\\ProgramData\\ComposerSetup\\bin\\composer.bat",
  "C:\\ProgramData\\ComposerSetup\\bin\\composer.exe",
  "C:\\Program Files\\Composer\\composer.phar"
)
$composer = Find-Exe "composer" $composerCandidates
$composerPhar = $null

function Ensure-LocalComposer {
  $toolsDir = Join-Path (Get-Location) "tools"
  $composerPhar = Join-Path $toolsDir "composer.phar"

  if (-not (Test-Path $toolsDir)) {
    New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null
  }

  if (-not (Test-Path $composerPhar)) {
    Write-Host "Composer no encontrado. Descargando composer.phar local..." -ForegroundColor Yellow
    try {
      # Descarga oficial
      Invoke-WebRequest -Uri "https://getcomposer.org/composer-stable.phar" -OutFile $composerPhar -UseBasicParsing | Out-Null
    } catch {
      Write-Host "No se pudo descargar Composer. Revisa tu conexión o permisos de red." -ForegroundColor Red
      throw
    }
  }

  return $composerPhar
}

if (-not $composer) {
  $composerPhar = Ensure-LocalComposer
}

# npm (Node LTS)
$npmCandidates = @(
  "$env:ProgramFiles\\nodejs\\npm.cmd",
  "$env:ProgramFiles\\nodejs\\npm.exe",
  "$env:LOCALAPPDATA\\Programs\\nodejs\\npm.cmd",
  "$env:LOCALAPPDATA\\Programs\\nodejs\\npm.exe"
)
$npm = Find-Exe "npm" $npmCandidates
if (-not $npm) {
  Write-Host "npm no está disponible. Instala Node LTS (winget) y reabre PowerShell." -ForegroundColor Red
  exit 1
}

# Si no existe un Laravel completo (artisan), lo generamos sin perder tus ficheros
function Ensure-LaravelSkeleton([string]$phpPath, [string]$composerExe, [string]$composerPharPath) {
  if (Test-Path ".\\artisan") { return }

  Write-Host "No existe 'artisan'. Generando skeleton Laravel 12 en este directorio..." -ForegroundColor Yellow

  $backupDir = ".\\.module_backup"
  if (Test-Path $backupDir) { Remove-Item -Recurse -Force $backupDir }
  New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

  $toBackup = @("app","bootstrap","config","database","resources","routes","public","tests","artisan","composer.json","composer.lock","package.json","vite.config.js",".env",".env.example")
  foreach ($p in $toBackup) {
    if (Test-Path ".\\$p") {
      Move-Item ".\\$p" (Join-Path $backupDir $p) -Force
    }
  }

  $tmp = ".\\.laravel_tmp"
  if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }

  # Crear proyecto en tmp
  if ($composerExe) {
    & $composerExe create-project laravel/laravel $tmp "^12.0"
    Assert-Ok $LASTEXITCODE "composer create-project"
  } else {
    & $phpPath $composerPharPath create-project laravel/laravel $tmp "^12.0"
    Assert-Ok $LASTEXITCODE "php composer.phar create-project"
  }

  # Copiar skeleton al root
  robocopy $tmp . /E /NFL /NDL /NJH /NJS | Out-Null

  # Restaurar módulo encima (prioridad a tus ficheros)
  robocopy $backupDir . /E /NFL /NDL /NJH /NJS | Out-Null

  Remove-Item -Recurse -Force $tmp
}

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
}

if (-not (Test-Path "database\\database.sqlite")) {
  New-Item -ItemType Directory -Force -Path "database" | Out-Null
  New-Item -ItemType File -Path "database\\database.sqlite" | Out-Null
}

Write-Host "Instalando dependencias PHP..." -ForegroundColor Cyan
if ($composer) {
  & $composer install
  Assert-Ok $LASTEXITCODE "composer install"
} else {
  & $php $composerPhar install
  Assert-Ok $LASTEXITCODE "php composer.phar install"
}

# Asegurar skeleton Laravel (artisan, public/, config base, etc.)
Ensure-LaravelSkeleton $php $composer $composerPhar

Write-Host "Generando APP_KEY..." -ForegroundColor Cyan
& $php artisan key:generate
Assert-Ok $LASTEXITCODE "php artisan key:generate"

Write-Host "Migrando y sembrando datos..." -ForegroundColor Cyan
if ($Fresh) {
  & $php artisan migrate:fresh --seed
  Assert-Ok $LASTEXITCODE "php artisan migrate:fresh --seed"
} else {
  & $php artisan migrate --seed
  Assert-Ok $LASTEXITCODE "php artisan migrate --seed"
}

Write-Host "Instalando dependencias frontend..." -ForegroundColor Cyan
& $npm install
if ($LASTEXITCODE -ne 0) {
  Write-Host "npm install falló; reintentando con --legacy-peer-deps..." -ForegroundColor Yellow
  & $npm install --legacy-peer-deps
  Assert-Ok $LASTEXITCODE "npm install --legacy-peer-deps"
}

Write-Host "OK. Para arrancar:" -ForegroundColor Green
Write-Host " - Backend: php artisan serve" -ForegroundColor Green
Write-Host " - Frontend: npm run dev" -ForegroundColor Green

