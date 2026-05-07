param(
  [switch]$Fresh
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command php -ErrorAction SilentlyContinue)) {
  Write-Host "PHP no está disponible en PATH. Instala Laragon (PHP 8.2) o añade php.exe al PATH." -ForegroundColor Red
  exit 1
}

if (-not (Get-Command composer -ErrorAction SilentlyContinue)) {
  Write-Host "Composer no está disponible en PATH. Instálalo y vuelve a ejecutar." -ForegroundColor Red
  exit 1
}

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
}

if (-not (Test-Path "database\\database.sqlite")) {
  New-Item -ItemType File -Path "database\\database.sqlite" | Out-Null
}

composer install

php artisan key:generate

if ($Fresh) {
  php artisan migrate:fresh --seed
} else {
  php artisan migrate --seed
}

Write-Host "OK. Ya tienes SQLite con datos de ejemplo (Somahoz)." -ForegroundColor Green

