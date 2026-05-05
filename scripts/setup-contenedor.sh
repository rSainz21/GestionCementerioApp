#!/bin/bash
# =============================================================================
# setup-contenedor.sh
# Se ejecuta UNA SOLA VEZ dentro del contenedor cementerio_php.
#
# Cómo usarlo:
#   Portainer → Containers → cementerio_php → Console → /bin/bash
#   bash /tmp/setup-contenedor.sh
#
# O pegando directamente en la consola de Portainer.
# =============================================================================

set -e

APP_DIR="/var/www/html"
REPO_URL="${REPO_URL:-}"   # exportar antes de ejecutar o editar aquí

echo "========================================"
echo "  Setup Cementerio Somahoz"
echo "========================================"

# ── 1. Apache: DocumentRoot → /var/www/html/public ───────────────────────────
echo ""
echo "[1/6] Configurando Apache..."

cat > /etc/apache2/sites-available/000-default.conf << 'APACHECONF'
<VirtualHost *:80>
    DocumentRoot /var/www/html/public

    <Directory /var/www/html/public>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/cementerio_error.log
    CustomLog ${APACHE_LOG_DIR}/cementerio_access.log combined
</VirtualHost>
APACHECONF

a2enmod rewrite > /dev/null 2>&1 || true
echo "  Apache configurado → DocumentRoot: /var/www/html/public"

# ── 2. Código de la aplicación ────────────────────────────────────────────────
echo ""
echo "[2/6] Desplegando código..."

if [ -f "/tmp/cementerio.tar.gz" ]; then
    echo "  Encontrado /tmp/cementerio.tar.gz — extrayendo..."
    tar -xzf /tmp/cementerio.tar.gz -C "$APP_DIR" --strip-components=1
elif [ -n "$REPO_URL" ]; then
    echo "  Clonando desde $REPO_URL..."
    rm -rf "$APP_DIR"/* "$APP_DIR"/.[!.]*  2>/dev/null || true
    git clone "$REPO_URL" /tmp/cementerio_repo
    cp -a /tmp/cementerio_repo/. "$APP_DIR"/
    rm -rf /tmp/cementerio_repo
else
    echo "  AVISO: no hay /tmp/cementerio.tar.gz ni REPO_URL definida."
    echo "  Sube el tar.gz primero (ver instrucciones) y vuelve a ejecutar."
    echo ""
    echo "  Para subir desde Windows (PowerShell):"
    echo "    scp -P 2224 cementerio.tar.gz root@10.10.20.31:/tmp/"
    echo ""
    exit 1
fi

echo "  Código desplegado en $APP_DIR"

# ── 3. .env de producción ─────────────────────────────────────────────────────
echo ""
echo "[3/6] Configurando .env..."

if [ ! -f "$APP_DIR/.env" ]; then
    if [ -f "$APP_DIR/.env.server.example" ]; then
        cp "$APP_DIR/.env.server.example" "$APP_DIR/.env"
        echo "  .env creado desde .env.server.example"
    else
        echo "  ERROR: no existe .env ni .env.server.example"
        exit 1
    fi
else
    echo "  .env ya existe — no se sobreescribe"
fi

# ── 4. Dependencias PHP ───────────────────────────────────────────────────────
echo ""
echo "[4/6] Instalando dependencias PHP (composer)..."

cd "$APP_DIR"
composer install --no-dev --optimize-autoloader --no-interaction 2>&1 | tail -5

# ── 5. Laravel: key, storage, permisos ───────────────────────────────────────
echo ""
echo "[5/6] Preparando Laravel..."

php artisan key:generate --force
php artisan storage:link --force 2>/dev/null || true
chmod -R 777 storage bootstrap/cache

echo "  APP_KEY generada"

# ── 6. Base de datos ──────────────────────────────────────────────────────────
echo ""
echo "[6/6] Ejecutando migraciones y seeders..."

php artisan migrate --force
php artisan db:seed --class=RolesAndPermissionsSeeder --force
php artisan db:seed --class=AdminUserSeeder --force

# Datos demo del cementerio (224 sepulturas, datos históricos)
read -r -p "  ¿Cargar datos de ejemplo del cementerio Somahoz? [s/N] " SEED_DEMO
if [[ "$SEED_DEMO" =~ ^[Ss]$ ]]; then
    php artisan db:seed --class=CementerioSomahozSeeder --force
    echo "  Datos demo cargados"
fi

# ── Reiniciar Apache ──────────────────────────────────────────────────────────
echo ""
echo "Reiniciando Apache..."
service apache2 restart 2>/dev/null || apachectl graceful 2>/dev/null || true

echo ""
echo "========================================"
echo "  ✓ Setup completado"
echo "  Acceso: http://10.10.20.31:8182"
echo "  Login:  admin / admin2026"
echo "========================================"
