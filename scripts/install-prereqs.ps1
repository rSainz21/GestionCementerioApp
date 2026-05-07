param(
  [switch]$SkipNode,
  [switch]$SkipPhp,
  [switch]$SkipComposer
)

$ErrorActionPreference = "Stop"

function Ensure-Winget {
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Host "winget no está disponible. Instala 'App Installer' desde Microsoft Store y vuelve a ejecutar." -ForegroundColor Red
    exit 1
  }
}

Ensure-Winget

$wingetCommon = @(
  "install",
  "-e",
  "--accept-package-agreements",
  "--accept-source-agreements"
)

if (-not $SkipPhp) {
  # PHP via Chocolatey no; prefer Laragon to bundle Apache+PHP+MySQL tools
  Write-Host "Instalando Laragon (PHP 8.2+)..." -ForegroundColor Cyan
  winget @wingetCommon --id LeNgocKhoa.Laragon
}

if (-not $SkipComposer) {
  Write-Host "Instalando Composer..." -ForegroundColor Cyan
  winget @wingetCommon --id Composer.Composer
}

if (-not $SkipNode) {
  Write-Host "Instalando Node.js LTS..." -ForegroundColor Cyan
  winget @wingetCommon --id OpenJS.NodeJS.LTS
}

Write-Host "Prerequisitos instalados. Cierra y reabre PowerShell para refrescar el PATH." -ForegroundColor Green

