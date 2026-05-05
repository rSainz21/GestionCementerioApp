# Despliegue en servidor — Stack Portainer

Guía para dejar el módulo Cementerio operativo en el servidor de producción (10.10.20.31) como stack independiente de Conecta.

## Puertos y acceso

| Servicio | Puerto externo | URL / uso |
|----------|---------------|-----------|
| Web      | 8182          | `http://10.10.20.31:8182` |
| SSH      | 2224          | `ssh conecta@10.10.20.31 -p 2224` |
| MySQL    | 3318          | Solo acceso externo/admin (phpMyAdmin, DBeaver) |

> Dentro del contenedor PHP, Laravel conecta a la BD por `cementerio_db:3306` (red Docker interna).

---

## Paso 1 — Crear el stack en Portainer

1. Portainer → **Stacks → Add Stack**
2. Nombre: `cementerio`
3. Copiar el contenido de `docker-compose.portainer.yml`
4. **Deploy the stack**

Docker crea automáticamente los volúmenes (`cementerio_app`, `cementerio_mysql_data`) y la red (`cementerio_net`).

---

## Paso 2 — Desplegar el código en el contenedor

Conectarse por SSH al contenedor PHP:

```bash
ssh conecta@10.10.20.31 -p 2224
```

Dentro del contenedor, ir a la carpeta de la app:

```bash
cd /var/www/html
```

Clonar el repositorio (o copiar los archivos):

```bash
git clone <url-del-repo> cementerio
cd cementerio
```

---

## Paso 3 — Configurar el entorno

Copiar la plantilla de `.env` y generar la clave:

```bash
cp .env.server.example .env
# Editar .env: ajustar APP_URL, contraseñas si se cambiaron, etc.
nano .env

php artisan key:generate
```

Instalar dependencias PHP:

```bash
composer install --no-dev --optimize-autoloader
```

Compilar assets frontend:

```bash
npm install
npm run build
```

Crear symlink de storage:

```bash
php artisan storage:link
```

Permisos de escritura:

```bash
chmod -R 777 storage bootstrap/cache
```

---

## Paso 4 — Base de datos

Ejecutar migraciones y seeders:

```bash
php artisan migrate --force
php artisan db:seed --class=RolesAndPermissionsSeeder
php artisan db:seed --class=AdminUserSeeder
# Solo si se quieren datos demo del cementerio:
# php artisan db:seed --class=CementerioSomahozSeeder
```

---

## Paso 5 — Configurar Apache

El contenedor `php82-ssh-conecta:1.3` usa Apache. Añadir el alias para que sirva la app desde el subpath correcto:

```apache
Alias /cementerio /var/www/html/cementerio/public

<Directory /var/www/html/cementerio/public>
    AllowOverride All
    Require all granted
</Directory>
```

Y asegurar que `public/.htaccess` tenga `RewriteBase /cementerio/`:

```apache
RewriteBase /cementerio/
```

O configurar como VirtualHost en el puerto 80 del contenedor para servir desde la raíz `/` (más limpio, sin `RewriteBase`):

```apache
<VirtualHost *:80>
    DocumentRoot /var/www/html/cementerio/public
    <Directory /var/www/html/cementerio/public>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

Reiniciar Apache:

```bash
service apache2 restart
# o: apachectl graceful
```

---

## Paso 6 — Verificar

- Abrir `http://10.10.20.31:8182` en el navegador
- Login: `admin / admin2026`

---

## Comandos útiles

```bash
# Ver logs del contenedor PHP
docker logs cementerio_php -f --tail 100

# Ver logs de MySQL
docker logs cementerio_db -f --tail 50

# Artisan desde fuera del contenedor
docker exec cementerio_php php artisan about
docker exec cementerio_php php artisan migrate:status

# Entrar al contenedor como root (si está disponible)
docker exec -it cementerio_php bash

# Backup de la base de datos
docker exec cementerio_db mysqldump -u root -proot_cementerio cementerio > backup_cementerio_$(date +%Y%m%d).sql
```

---

## Cosas a NO hacer

- No reutilizar puertos de Conecta (3317, 8181, 2223)
- No conectarse a `cementerio_db` como `DB_HOST=localhost` o `127.0.0.1`
- No mezclar la red `cementerio_net` con `conecta_net`
- No usar el puerto externo 3318 como `DB_PORT` en el `.env` de Laravel
