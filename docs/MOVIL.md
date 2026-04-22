## Móvil (futuro) — qué queda preparado en esta rama

Esta rama se mantiene **solo para la app web** (Laravel + Vue).

La app móvil (Expo) **no se versiona aquí** porque estaba desactualizada (`cementerio-app/` fue retirada de esta rama).

### Integración “móvil comparte datos con web”

Para una futura app móvil se deja preparado:

- **MySQL persistente (Docker)**: el servicio `mysql` usa el volumen `mysql_data`.
- **API HTTP `mysql-api`** (Node/Express):
  - se ejecuta en Docker como servicio `mysql-api` (compose prod)
  - se protege con token `API_TOKEN` (variable `MYSQL_API_TOKEN` en el `.env` del root)
- **Proxy por Nginx**:
  - `GET /mysql-api/*` se proxyea a `mysql-api:8787/*`
  - esto permite consumir la API móvil por el mismo host/puerto que la web (ej: `http://<IP>:8000/mysql-api`)

### Endpoints de verificación

- `GET /mysql-api/health` → debe devolver `{ ok: true, db: true }`.

