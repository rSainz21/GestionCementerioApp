-- =============================================================================
-- ESQUEMA DE BASE DE DATOS: Gestión Cementerio (Somahoz)
-- Adaptado a PostgreSQL/Supabase tomando como base `tablas_cem.sql` (MySQL).
-- Objetivo: que el esquema coincida con tu BD real y, a la vez, mantener
-- compatibilidad con la app (RLS + RPCs usados por el frontend).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ENUMs (equivalentes a MySQL)
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_bloque') THEN
    CREATE TYPE tipo_bloque AS ENUM ('nichos', 'columbarios');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_sepultura') THEN
    CREATE TYPE tipo_sepultura AS ENUM ('sepultura', 'nicho', 'columbario', 'panteon');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_sepultura') THEN
    CREATE TYPE estado_sepultura AS ENUM ('libre', 'ocupada', 'reservada', 'clausurada');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_concesion') THEN
    CREATE TYPE tipo_concesion AS ENUM ('perpetua', 'temporal');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_concesion') THEN
    CREATE TYPE estado_concesion AS ENUM ('vigente', 'caducada', 'renovada', 'transferida', 'anulada');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'moneda_concesion') THEN
    CREATE TYPE moneda_concesion AS ENUM ('pesetas', 'euros');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rol_concesion_tercero') THEN
    -- MySQL: 'concesionario','heredero','solicitante'
    CREATE TYPE rol_concesion_tercero AS ENUM ('concesionario', 'heredero', 'solicitante');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_documento') THEN
    CREATE TYPE tipo_documento AS ENUM ('fotografia','escaneo','certificado','solicitud','concesion_doc','plano','otro');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_movimiento') THEN
    CREATE TYPE tipo_movimiento AS ENUM ('inhumacion', 'exhumacion', 'traslado');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entidad_tipo_registro_fuente') THEN
    CREATE TYPE entidad_tipo_registro_fuente AS ENUM ('sepultura','concesion','tercero','difunto');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'confianza_registro_fuente') THEN
    CREATE TYPE confianza_registro_fuente AS ENUM ('alta','media','baja');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_fuente') THEN
    CREATE TYPE tipo_fuente AS ENUM ('libro_registro','expediente','padron','escaneo','csv_gestiona','otro');
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Tablas (orden FK)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cemn_cementerios (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre varchar(120) NOT NULL,
  municipio varchar(120) NOT NULL,
  direccion varchar(255),
  lat numeric(10,7),
  lon numeric(10,7),
  notas text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE cemn_cementerios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Cementerios visibles para autenticados" ON cemn_cementerios;
CREATE POLICY "Cementerios visibles para autenticados"
  ON cemn_cementerios FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Cementerios editables para autenticados" ON cemn_cementerios;
CREATE POLICY "Cementerios editables para autenticados"
  ON cemn_cementerios FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS cemn_zonas (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cementerio_id integer NOT NULL REFERENCES cemn_cementerios(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  nombre varchar(80) NOT NULL,
  codigo varchar(20),
  descripcion text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Migración: si la tabla existía sin cementerio_id (schema anterior), lo añadimos.
ALTER TABLE cemn_zonas
  ADD COLUMN IF NOT EXISTS cementerio_id integer;

-- Asegurar que haya un cementerio "1" y rellenar nulos.
INSERT INTO cemn_cementerios (id, nombre, municipio, direccion)
OVERRIDING SYSTEM VALUE
VALUES (1, 'Cementerio Municipal de Somahoz', 'Los Corrales de Buelna', 'Somahoz, Los Corrales de Buelna, Cantabria')
ON CONFLICT (id) DO NOTHING;

UPDATE cemn_zonas SET cementerio_id = 1 WHERE cementerio_id IS NULL;

-- Añadir FK si no existe (nombre estable para poder comprobar).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cemn_zonas_cementerio_id_fkey'
  ) THEN
    ALTER TABLE cemn_zonas
      ADD CONSTRAINT cemn_zonas_cementerio_id_fkey
      FOREIGN KEY (cementerio_id) REFERENCES cemn_cementerios(id)
      ON DELETE RESTRICT ON UPDATE RESTRICT;
  END IF;
END $$;

-- Si quieres forzar NOT NULL en una BD ya poblada, hazlo después de revisar datos.

CREATE INDEX IF NOT EXISTS idx_zonas_cementerio ON cemn_zonas(cementerio_id);

ALTER TABLE cemn_zonas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Zonas visibles para autenticados" ON cemn_zonas;
CREATE POLICY "Zonas visibles para autenticados"
  ON cemn_zonas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Zonas editables para autenticados" ON cemn_zonas;
CREATE POLICY "Zonas editables para autenticados"
  ON cemn_zonas FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS cemn_bloques (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  zona_id integer NOT NULL REFERENCES cemn_zonas(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  nombre varchar(80) NOT NULL,
  codigo varchar(20) NOT NULL,
  tipo tipo_bloque NOT NULL,
  filas smallint NOT NULL CHECK (filas > 0),
  columnas smallint NOT NULL CHECK (columnas > 0),
  descripcion text,
  lat numeric(10,7),
  lon numeric(10,7),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (codigo)
);

CREATE INDEX IF NOT EXISTS idx_bloques_zona ON cemn_bloques(zona_id);

ALTER TABLE cemn_bloques ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Bloques visibles para autenticados" ON cemn_bloques;
CREATE POLICY "Bloques visibles para autenticados"
  ON cemn_bloques FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Bloques editables para autenticados" ON cemn_bloques;
CREATE POLICY "Bloques editables para autenticados"
  ON cemn_bloques FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS cemn_sepulturas (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  zona_id integer NOT NULL REFERENCES cemn_zonas(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  bloque_id integer REFERENCES cemn_bloques(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  tipo tipo_sepultura NOT NULL,
  numero integer,
  fila smallint,
  columna smallint,
  parte varchar(20),
  codigo varchar(40),
  estado estado_sepultura NOT NULL DEFAULT 'libre',
  largo_m numeric(4,2),
  ancho_m numeric(4,2),
  ubicacion_texto varchar(500),
  lat numeric(10,7),
  lon numeric(10,7),
  imagen varchar(500),
  notas text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (codigo)
);

CREATE INDEX IF NOT EXISTS idx_sepulturas_zona ON cemn_sepulturas(zona_id);
CREATE INDEX IF NOT EXISTS idx_sepulturas_bloque ON cemn_sepulturas(bloque_id);
CREATE INDEX IF NOT EXISTS idx_sepulturas_tipo ON cemn_sepulturas(tipo);
CREATE INDEX IF NOT EXISTS idx_sepulturas_numero ON cemn_sepulturas(numero);
CREATE INDEX IF NOT EXISTS idx_sepulturas_estado ON cemn_sepulturas(estado);

ALTER TABLE cemn_sepulturas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Sepulturas visibles para autenticados" ON cemn_sepulturas;
CREATE POLICY "Sepulturas visibles para autenticados"
  ON cemn_sepulturas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Sepulturas editables para autenticados" ON cemn_sepulturas;
CREATE POLICY "Sepulturas editables para autenticados"
  ON cemn_sepulturas FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS cemn_terceros (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dni varchar(15),
  nombre varchar(60) NOT NULL,
  apellido1 varchar(60),
  apellido2 varchar(60),
  nombre_original varchar(200),
  telefono varchar(20),
  email varchar(120),
  direccion varchar(255),
  municipio varchar(80),
  provincia varchar(80),
  cp varchar(10),
  es_empresa boolean NOT NULL DEFAULT false,
  cif varchar(15),
  razon_social varchar(200),
  notas text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Migración: si `cemn_terceros` ya existía con menos columnas (schema anterior),
-- añadimos las nuevas antes de crear índices sobre ellas.
ALTER TABLE cemn_terceros
  ADD COLUMN IF NOT EXISTS nombre_original varchar(200),
  ADD COLUMN IF NOT EXISTS telefono varchar(20),
  ADD COLUMN IF NOT EXISTS email varchar(120),
  ADD COLUMN IF NOT EXISTS direccion varchar(255),
  ADD COLUMN IF NOT EXISTS municipio varchar(80),
  ADD COLUMN IF NOT EXISTS provincia varchar(80),
  ADD COLUMN IF NOT EXISTS cp varchar(10),
  ADD COLUMN IF NOT EXISTS es_empresa boolean,
  ADD COLUMN IF NOT EXISTS cif varchar(15),
  ADD COLUMN IF NOT EXISTS razon_social varchar(200),
  ADD COLUMN IF NOT EXISTS notas text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- Defaults/normalización mínima para columnas nuevas
UPDATE cemn_terceros SET es_empresa = false WHERE es_empresa IS NULL;
UPDATE cemn_terceros SET created_at = now() WHERE created_at IS NULL;
UPDATE cemn_terceros SET updated_at = now() WHERE updated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_terceros_dni ON cemn_terceros(dni);
CREATE INDEX IF NOT EXISTS idx_terceros_nombre ON cemn_terceros(apellido1, apellido2, nombre);
CREATE INDEX IF NOT EXISTS idx_terceros_cif ON cemn_terceros(cif);

ALTER TABLE cemn_terceros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Terceros visibles para autenticados" ON cemn_terceros;
CREATE POLICY "Terceros visibles para autenticados"
  ON cemn_terceros FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Terceros editables para autenticados" ON cemn_terceros;
CREATE POLICY "Terceros editables para autenticados"
  ON cemn_terceros FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS cemn_concesiones (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sepultura_id integer NOT NULL REFERENCES cemn_sepulturas(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  numero_expediente varchar(30),
  tipo tipo_concesion NOT NULL DEFAULT 'temporal',
  fecha_concesion date,
  fecha_vencimiento date,
  duracion_anos integer,
  estado estado_concesion NOT NULL DEFAULT 'vigente',
  importe numeric(10,2),
  moneda moneda_concesion DEFAULT 'euros',
  texto_concesion text,
  concesion_previa_id integer REFERENCES cemn_concesiones(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  notas text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Migración: si `cemn_concesiones` ya existía con menos columnas,
-- añadimos las necesarias antes de índices/uso por la app.
ALTER TABLE cemn_concesiones
  ADD COLUMN IF NOT EXISTS numero_expediente varchar(30),
  ADD COLUMN IF NOT EXISTS tipo tipo_concesion,
  ADD COLUMN IF NOT EXISTS fecha_concesion date,
  ADD COLUMN IF NOT EXISTS fecha_vencimiento date,
  ADD COLUMN IF NOT EXISTS duracion_anos integer,
  ADD COLUMN IF NOT EXISTS estado estado_concesion,
  ADD COLUMN IF NOT EXISTS importe numeric(10,2),
  ADD COLUMN IF NOT EXISTS moneda moneda_concesion,
  ADD COLUMN IF NOT EXISTS texto_concesion text,
  ADD COLUMN IF NOT EXISTS concesion_previa_id integer,
  ADD COLUMN IF NOT EXISTS notas text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- Defaults mínimos
UPDATE cemn_concesiones SET tipo = 'temporal' WHERE tipo IS NULL;
UPDATE cemn_concesiones SET estado = 'vigente' WHERE estado IS NULL;
UPDATE cemn_concesiones SET moneda = 'euros' WHERE moneda IS NULL;
UPDATE cemn_concesiones SET created_at = now() WHERE created_at IS NULL;
UPDATE cemn_concesiones SET updated_at = now() WHERE updated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_concesiones_sepultura ON cemn_concesiones(sepultura_id);
CREATE INDEX IF NOT EXISTS idx_concesiones_expediente ON cemn_concesiones(numero_expediente);
CREATE INDEX IF NOT EXISTS idx_concesiones_estado ON cemn_concesiones(estado);
CREATE INDEX IF NOT EXISTS idx_concesiones_fecha ON cemn_concesiones(fecha_concesion);

ALTER TABLE cemn_concesiones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Concesiones visibles para autenticados" ON cemn_concesiones;
CREATE POLICY "Concesiones visibles para autenticados"
  ON cemn_concesiones FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Concesiones editables para autenticados" ON cemn_concesiones;
CREATE POLICY "Concesiones editables para autenticados"
  ON cemn_concesiones FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS cemn_concesion_terceros (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  concesion_id integer NOT NULL REFERENCES cemn_concesiones(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  tercero_id integer NOT NULL REFERENCES cemn_terceros(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  rol rol_concesion_tercero NOT NULL DEFAULT 'concesionario',
  fecha_desde date,
  fecha_hasta date,
  activo boolean NOT NULL DEFAULT true,
  notas text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_concesion_terceros_activo ON cemn_concesion_terceros(concesion_id, activo);
CREATE INDEX IF NOT EXISTS idx_concesion_terceros_tercero ON cemn_concesion_terceros(tercero_id);

ALTER TABLE cemn_concesion_terceros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Concesion terceros visibles para autenticados" ON cemn_concesion_terceros;
CREATE POLICY "Concesion terceros visibles para autenticados"
  ON cemn_concesion_terceros FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Concesion terceros editables para autenticados" ON cemn_concesion_terceros;
CREATE POLICY "Concesion terceros editables para autenticados"
  ON cemn_concesion_terceros FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS cemn_difuntos (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tercero_id integer REFERENCES cemn_terceros(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  nombre_completo varchar(200) NOT NULL,
  fecha_fallecimiento date,
  fecha_inhumacion date,
  sepultura_id integer REFERENCES cemn_sepulturas(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  es_titular boolean NOT NULL DEFAULT true,
  parentesco varchar(60),
  notas text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Migración: si `cemn_difuntos` ya existía con menos columnas (schema anterior),
-- añadimos las columnas del MySQL (`tablas_cem.sql`) antes de índices/uso por la app.
ALTER TABLE cemn_difuntos
  ADD COLUMN IF NOT EXISTS tercero_id integer,
  ADD COLUMN IF NOT EXISTS fecha_fallecimiento date,
  ADD COLUMN IF NOT EXISTS fecha_inhumacion date,
  ADD COLUMN IF NOT EXISTS sepultura_id integer,
  ADD COLUMN IF NOT EXISTS es_titular boolean,
  ADD COLUMN IF NOT EXISTS parentesco varchar(60),
  ADD COLUMN IF NOT EXISTS notas text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- Defaults mínimos
UPDATE cemn_difuntos SET es_titular = true WHERE es_titular IS NULL;
UPDATE cemn_difuntos SET created_at = now() WHERE created_at IS NULL;
UPDATE cemn_difuntos SET updated_at = now() WHERE updated_at IS NULL;

-- Añadir FKs si faltan (en tablas ya existentes suelen no estar)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cemn_difuntos_tercero_id_fkey') THEN
    ALTER TABLE cemn_difuntos
      ADD CONSTRAINT cemn_difuntos_tercero_id_fkey
      FOREIGN KEY (tercero_id) REFERENCES cemn_terceros(id)
      ON DELETE RESTRICT ON UPDATE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cemn_difuntos_sepultura_id_fkey') THEN
    ALTER TABLE cemn_difuntos
      ADD CONSTRAINT cemn_difuntos_sepultura_id_fkey
      FOREIGN KEY (sepultura_id) REFERENCES cemn_sepulturas(id)
      ON DELETE RESTRICT ON UPDATE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_difuntos_tercero ON cemn_difuntos(tercero_id);
CREATE INDEX IF NOT EXISTS idx_difuntos_sepultura ON cemn_difuntos(sepultura_id);
CREATE INDEX IF NOT EXISTS idx_difuntos_sepultura_titular ON cemn_difuntos(sepultura_id, es_titular);
-- Equivalente Postgres al idx_nombre(nombre_completo(100)) de MySQL:
-- índice full-text para búsquedas rápidas por nombre.
CREATE INDEX IF NOT EXISTS idx_difuntos_nombre_fts
  ON cemn_difuntos USING gin (to_tsvector('spanish', coalesce(nombre_completo, '')));

ALTER TABLE cemn_difuntos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Difuntos visibles para autenticados" ON cemn_difuntos;
CREATE POLICY "Difuntos visibles para autenticados"
  ON cemn_difuntos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Difuntos editables para autenticados" ON cemn_difuntos;
CREATE POLICY "Difuntos editables para autenticados"
  ON cemn_difuntos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS cemn_documentos (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sepultura_id integer NOT NULL REFERENCES cemn_sepulturas(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  tipo tipo_documento NOT NULL DEFAULT 'otro',
  nombre_original varchar(255) NOT NULL,
  ruta_archivo varchar(500) NOT NULL,
  mime_type varchar(80),
  tamano_bytes integer,
  descripcion text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documentos_sepultura ON cemn_documentos(sepultura_id);

ALTER TABLE cemn_documentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Documentos visibles para autenticados" ON cemn_documentos;
CREATE POLICY "Documentos visibles para autenticados"
  ON cemn_documentos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Documentos editables para autenticados" ON cemn_documentos;
CREATE POLICY "Documentos editables para autenticados"
  ON cemn_documentos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS cemn_fuentes (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre varchar(200) NOT NULL,
  tipo tipo_fuente NOT NULL,
  descripcion text,
  periodo_desde integer,
  periodo_hasta integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE cemn_fuentes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Fuentes visibles para autenticados" ON cemn_fuentes;
CREATE POLICY "Fuentes visibles para autenticados"
  ON cemn_fuentes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Fuentes editables para autenticados" ON cemn_fuentes;
CREATE POLICY "Fuentes editables para autenticados"
  ON cemn_fuentes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS cemn_registro_fuentes (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fuente_id integer NOT NULL REFERENCES cemn_fuentes(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  entidad_tipo entidad_tipo_registro_fuente NOT NULL,
  entidad_id integer NOT NULL,
  pagina varchar(20),
  confianza confianza_registro_fuente DEFAULT 'media',
  notas text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_registro_fuentes_fuente ON cemn_registro_fuentes(fuente_id);
CREATE INDEX IF NOT EXISTS idx_registro_fuentes_entidad ON cemn_registro_fuentes(entidad_tipo, entidad_id);

ALTER TABLE cemn_registro_fuentes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Registro fuentes visible para autenticados" ON cemn_registro_fuentes;
CREATE POLICY "Registro fuentes visible para autenticados"
  ON cemn_registro_fuentes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Registro fuentes editable para autenticados" ON cemn_registro_fuentes;
CREATE POLICY "Registro fuentes editable para autenticados"
  ON cemn_registro_fuentes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS cemn_movimientos (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  difunto_id integer NOT NULL REFERENCES cemn_difuntos(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  tipo tipo_movimiento NOT NULL,
  fecha date,
  sepultura_origen_id integer REFERENCES cemn_sepulturas(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  sepultura_destino_id integer REFERENCES cemn_sepulturas(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  numero_expediente varchar(30),
  notas text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Migración: si `cemn_movimientos` venía del schema anterior (con `sepultura_id`),
-- añadimos columnas nuevas para origen/destino y mantenemos compatibilidad.
ALTER TABLE cemn_movimientos
  ADD COLUMN IF NOT EXISTS sepultura_origen_id integer,
  ADD COLUMN IF NOT EXISTS sepultura_destino_id integer,
  ADD COLUMN IF NOT EXISTS numero_expediente varchar(30),
  ADD COLUMN IF NOT EXISTS notas text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- Si existía `sepultura_id`, úsalo como origen por defecto cuando falte.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cemn_movimientos'
      AND column_name = 'sepultura_id'
  ) THEN
    EXECUTE 'UPDATE cemn_movimientos SET sepultura_origen_id = sepultura_id WHERE sepultura_origen_id IS NULL';
  END IF;
END $$;

UPDATE cemn_movimientos SET created_at = now() WHERE created_at IS NULL;
UPDATE cemn_movimientos SET updated_at = now() WHERE updated_at IS NULL;

-- Añadir FKs (solo si faltan)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cemn_movimientos_sepultura_origen_id_fkey') THEN
    ALTER TABLE cemn_movimientos
      ADD CONSTRAINT cemn_movimientos_sepultura_origen_id_fkey
      FOREIGN KEY (sepultura_origen_id) REFERENCES cemn_sepulturas(id)
      ON DELETE RESTRICT ON UPDATE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cemn_movimientos_sepultura_destino_id_fkey') THEN
    ALTER TABLE cemn_movimientos
      ADD CONSTRAINT cemn_movimientos_sepultura_destino_id_fkey
      FOREIGN KEY (sepultura_destino_id) REFERENCES cemn_sepulturas(id)
      ON DELETE RESTRICT ON UPDATE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_movimientos_difunto ON cemn_movimientos(difunto_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_origen ON cemn_movimientos(sepultura_origen_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_destino ON cemn_movimientos(sepultura_destino_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_tipo ON cemn_movimientos(tipo);
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON cemn_movimientos(fecha);

ALTER TABLE cemn_movimientos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Movimientos visibles para autenticados" ON cemn_movimientos;
CREATE POLICY "Movimientos visibles para autenticados"
  ON cemn_movimientos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Movimientos editables para autenticados" ON cemn_movimientos;
CREATE POLICY "Movimientos editables para autenticados"
  ON cemn_movimientos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- Auditoría (usado por la Edge Function `sepulturas-auditoria` y cola offline)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cemn_audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sepultura_id integer NOT NULL REFERENCES cemn_sepulturas(id) ON DELETE CASCADE,
  actor_uid uuid,
  source varchar(30) NOT NULL DEFAULT 'app',
  action varchar(60) NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cemn_audit_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Audit events visibles para autenticados" ON cemn_audit_events;
CREATE POLICY "Audit events visibles para autenticados"
  ON cemn_audit_events FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Audit events insertables para autenticados" ON cemn_audit_events;
CREATE POLICY "Audit events insertables para autenticados"
  ON cemn_audit_events FOR INSERT TO authenticated WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- RPCs de workflows (manteniendo la firma que usa la app)
-- -----------------------------------------------------------------------------
-- Migración: eliminar versión vieja (firma anterior) para evitar confusión
DROP FUNCTION IF EXISTS cemn_workflow_inhumacion(integer, text, date, boolean, text);

CREATE OR REPLACE FUNCTION cemn_workflow_inhumacion(
  p_sepultura_id integer,
  p_nombre_completo text,
  p_fecha_fallecimiento date DEFAULT NULL,
  p_fecha_inhumacion date DEFAULT NULL,
  p_es_titular boolean DEFAULT true,
  p_parentesco text DEFAULT NULL,
  p_notas text DEFAULT NULL,
  p_tercero_id integer DEFAULT NULL,
  p_observaciones text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_difunto_id integer;
  v_mov_id integer;
BEGIN
  IF p_sepultura_id IS NULL OR p_sepultura_id <= 0 THEN
    RAISE EXCEPTION 'sepultura_id inválido';
  END IF;
  IF p_nombre_completo IS NULL OR length(trim(p_nombre_completo)) = 0 THEN
    RAISE EXCEPTION 'nombre_completo requerido';
  END IF;

  PERFORM 1 FROM cemn_sepulturas WHERE id = p_sepultura_id FOR UPDATE;

  INSERT INTO cemn_difuntos (tercero_id, nombre_completo, fecha_fallecimiento, fecha_inhumacion, sepultura_id, es_titular, parentesco, notas)
  VALUES (
    p_tercero_id,
    trim(p_nombre_completo),
    p_fecha_fallecimiento,
    COALESCE(p_fecha_inhumacion, CURRENT_DATE),
    p_sepultura_id,
    COALESCE(p_es_titular, true),
    NULLIF(trim(COALESCE(p_parentesco, '')), ''),
    NULLIF(trim(COALESCE(p_notas, '')), '')
  )
  RETURNING id INTO v_difunto_id;

  UPDATE cemn_sepulturas SET estado = 'ocupada' WHERE id = p_sepultura_id;

  INSERT INTO cemn_movimientos (difunto_id, tipo, fecha, sepultura_origen_id, sepultura_destino_id, notas)
  VALUES (v_difunto_id, 'inhumacion', CURRENT_DATE, p_sepultura_id, NULL, p_observaciones)
  RETURNING id INTO v_mov_id;

  RETURN jsonb_build_object('ok', true, 'difunto_id', v_difunto_id, 'movimiento_id', v_mov_id);
END;
$$;

REVOKE ALL ON FUNCTION cemn_workflow_inhumacion(integer, text, date, date, boolean, text, text, integer, text) FROM public;
GRANT EXECUTE ON FUNCTION cemn_workflow_inhumacion(integer, text, date, date, boolean, text, text, integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION cemn_workflow_exhumacion(
  p_sepultura_id integer,
  p_difunto_id integer,
  p_tipo tipo_movimiento,
  p_fecha date DEFAULT CURRENT_DATE,
  p_observaciones text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_restantes integer;
  v_mov_id integer;
BEGIN
  IF p_tipo NOT IN ('exhumacion', 'traslado') THEN
    RAISE EXCEPTION 'Tipo inválido para este workflow: %', p_tipo;
  END IF;

  PERFORM 1 FROM cemn_sepulturas WHERE id = p_sepultura_id FOR UPDATE;

  INSERT INTO cemn_movimientos (difunto_id, tipo, fecha, sepultura_origen_id, sepultura_destino_id, notas)
  VALUES (p_difunto_id, p_tipo, COALESCE(p_fecha, CURRENT_DATE), p_sepultura_id, NULL, p_observaciones)
  RETURNING id INTO v_mov_id;

  UPDATE cemn_difuntos
    SET sepultura_id = NULL
  WHERE id = p_difunto_id
    AND sepultura_id = p_sepultura_id;

  SELECT count(*) INTO v_restantes FROM cemn_difuntos WHERE sepultura_id = p_sepultura_id;
  IF v_restantes = 0 THEN
    UPDATE cemn_sepulturas SET estado = 'libre' WHERE id = p_sepultura_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'movimiento_id', v_mov_id,
    'restantes', v_restantes
  );
END;
$$;

REVOKE ALL ON FUNCTION cemn_workflow_exhumacion(integer, integer, tipo_movimiento, date, text) FROM public;
GRANT EXECUTE ON FUNCTION cemn_workflow_exhumacion(integer, integer, tipo_movimiento, date, text) TO authenticated;

-- -----------------------------------------------------------------------------
-- Semillas mínimas (opcionales) para arrancar como en el export MySQL
-- -----------------------------------------------------------------------------
INSERT INTO cemn_cementerios (id, nombre, municipio, direccion)
OVERRIDING SYSTEM VALUE
VALUES (1, 'Cementerio Municipal de Somahoz', 'Los Corrales de Buelna', 'Somahoz, Los Corrales de Buelna, Cantabria')
ON CONFLICT (id) DO NOTHING;

