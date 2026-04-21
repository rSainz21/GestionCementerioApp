#!/usr/bin/env sh
set -eu

cd /var/www/html

if [ "${1:-}" != "" ]; then
  exec "$@"
fi

# Si /public está montado como volumen compartido, puede venir vacío.
# Lo poblamos desde la copia de la imagen en /opt/app-public.
if [ ! -f public/index.php ]; then
  mkdir -p public
  cp -R /opt/app-public/* public/ || true
fi

# Asegurar que el build de Vite está disponible en el public compartido
if [ ! -f public/build/manifest.json ]; then
  mkdir -p public/build
  cp -R /opt/app-public/build/* public/build/ || true
fi

mkdir -p storage bootstrap/cache
mkdir -p \
  storage/app/public \
  storage/framework/cache/data \
  storage/framework/sessions \
  storage/framework/views \
  storage/logs
chmod -R 777 storage bootstrap/cache || true

if [ -f public/hot ]; then
  rm -f public/hot || true
fi

if [ ! -e public/storage ]; then
  php artisan storage:link || true
fi

tries=0
until php artisan migrate --force; do
  tries=$((tries+1))
  if [ "$tries" -ge 30 ]; then
    echo "ERROR: no se pudo migrar (MySQL no disponible o config incorrecta)."
    exit 1
  fi
  echo "MySQL aún no listo; reintentando migrate... ($tries/30)"
  sleep 2
done

php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

exec php-fpm
