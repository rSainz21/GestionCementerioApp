# MySQL API (para usar la app sin Supabase)

Este servicio expone endpoints HTTP para ejecutar workflows transaccionales contra tu base de datos **MySQL** con el esquema de `tablas_cem.sql`.

## Variables de entorno

Copia `.env.example` a `.env` y rellena:

- `API_TOKEN`: token simple para proteger el API (se envía como `Authorization: Bearer <token>`)
- `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`
- `CORS_ORIGIN` (opcional): por ejemplo `http://192.168.100.69:8000`

## Ejecutar en local

```bash
npm install
npm run dev
```

Healthcheck:

```bash
curl http://localhost:8787/health
```

## Docker

```bash
docker build -t cementerio-mysql-api .
docker run -d --name cementerio-mysql-api --restart unless-stopped -p 8787:8787 --env-file .env cementerio-mysql-api
```

## Endpoints

- `POST /workflows/inhumacion`
- `POST /workflows/exhumacion`

Todos requieren `Authorization: Bearer <API_TOKEN>`.

