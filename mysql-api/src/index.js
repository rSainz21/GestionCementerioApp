import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { createPoolFromEnv } from './db.js';
import { requireToken } from './auth.js';

const app = express();
const port = Number(process.env.PORT ?? 8787);
const pool = createPoolFromEnv();

app.use(express.json({ limit: '2mb' }));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()) : true,
    credentials: false
  })
);

app.get('/health', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 as ok');
    return res.json({ ok: true, db: (rows?.[0]?.ok ?? 1) === 1 });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

// ---- Lecturas y búsquedas (para que móvil pueda “ver todo”) ----

app.get('/catalogo', requireToken, async (_req, res) => {
  try {
    const [zonas] = await pool.query(
      'SELECT id, cementerio_id, nombre, codigo, descripcion FROM cemn_zonas ORDER BY id'
    );
    const [bloques] = await pool.query(
      'SELECT id, zona_id, nombre, codigo, tipo, filas, columnas, descripcion FROM cemn_bloques ORDER BY id'
    );
    return res.json({ ok: true, zonas, bloques });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

app.get('/bloques/:id/sepulturas', requireToken, async (req, res) => {
  const bloqueId = Number(req.params.id);
  if (!Number.isFinite(bloqueId) || bloqueId <= 0) return res.status(400).json({ ok: false, error: 'bloque id inválido' });
  try {
    const [items] = await pool.query(
      `SELECT id, bloque_id, zona_id, tipo, numero, fila, columna, codigo, estado, notas
       FROM cemn_sepulturas
       WHERE bloque_id = :bid
       ORDER BY columna ASC, fila ASC`,
      { bid: bloqueId }
    );
    return res.json({ ok: true, items });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

app.get('/sepulturas/:id', requireToken, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ ok: false, error: 'sepultura id inválido' });
  try {
    const [[sep]] = await pool.query(
      `SELECT id, zona_id, bloque_id, tipo, numero, fila, columna, codigo, estado, ubicacion_texto, lat, lon, imagen, notas
       FROM cemn_sepulturas WHERE id = :id LIMIT 1`,
      { id }
    );
    if (!sep) return res.status(404).json({ ok: false, error: 'No encontrada' });

    const [[zona]] = await pool.query('SELECT id, nombre, codigo FROM cemn_zonas WHERE id=:id LIMIT 1', { id: sep.zona_id });
    const [[bloque]] = await pool.query(
      'SELECT id, zona_id, nombre, codigo, tipo, filas, columnas FROM cemn_bloques WHERE id=:id LIMIT 1',
      { id: sep.bloque_id }
    );

    const [difuntos] = await pool.query(
      'SELECT id, tercero_id, nombre_completo, fecha_fallecimiento, fecha_inhumacion, sepultura_id, es_titular, parentesco, notas, foto_path FROM cemn_difuntos WHERE sepultura_id=:sid ORDER BY es_titular DESC, fecha_inhumacion DESC',
      { sid: id }
    );
    const difunto_titular = Array.isArray(difuntos) ? difuntos.find((d) => Number(d.es_titular) === 1) ?? null : null;

    const [concesiones] = await pool.query(
      'SELECT id, sepultura_id, numero_expediente, tipo, fecha_concesion, fecha_vencimiento, duracion_anos, estado, importe, moneda, concesion_previa_id, notas FROM cemn_concesiones WHERE sepultura_id=:sid AND estado=\"vigente\" ORDER BY fecha_concesion DESC LIMIT 1',
      { sid: id }
    );
    const concesion_vigente = concesiones?.[0] ?? null;

    let terceros = [];
    if (concesion_vigente?.id) {
      const [t] = await pool.query(
        `SELECT t.id, t.dni, t.nombre, t.apellido1, t.apellido2, t.email, t.telefono, ct.rol
         FROM cemn_concesion_terceros ct
         JOIN cemn_terceros t ON t.id = ct.tercero_id
         WHERE ct.concesion_id = :cid
         ORDER BY (ct.rol='concesionario') DESC, t.id ASC`,
        { cid: concesion_vigente.id }
      );
      terceros = t ?? [];
    }

    const [movimientos] = difunto_titular?.id
      ? await pool.query(
          'SELECT id, difunto_id, tipo, fecha, sepultura_origen_id, sepultura_destino_id, numero_expediente, notas FROM cemn_movimientos WHERE difunto_id=:did ORDER BY fecha DESC, id DESC',
          { did: difunto_titular.id }
        )
      : [[]];

    const [documentos] = await pool.query(
      'SELECT id, sepultura_id, tipo, nombre_original, ruta_archivo, mime_type, tamano_bytes, descripcion, created_at FROM cemn_documentos WHERE sepultura_id=:sid ORDER BY created_at DESC, id DESC',
      { sid: id }
    );

    return res.json({
      ok: true,
      item: {
        ...sep,
        zona: zona ?? null,
        bloque: bloque ?? null,
        difunto_titular,
        difuntos,
        concesion_vigente: concesion_vigente ? { ...concesion_vigente, terceros } : null,
        movimientos,
        documentos
      }
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

app.get('/search/difuntos', requireToken, async (req, res) => {
  const q = String(req.query.q ?? '').trim();
  if (q.length < 2) return res.json({ ok: true, items: [] });
  try {
    const [items] = await pool.query(
      `SELECT d.id, d.nombre_completo, d.fecha_fallecimiento, d.fecha_inhumacion, d.sepultura_id, t.dni,
              s.codigo AS sepultura_codigo, b.nombre AS bloque_nombre, z.nombre AS zona_nombre
       FROM cemn_difuntos d
       LEFT JOIN cemn_terceros t ON t.id = d.tercero_id
       LEFT JOIN cemn_sepulturas s ON s.id = d.sepultura_id
       LEFT JOIN cemn_bloques b ON b.id = s.bloque_id
       LEFT JOIN cemn_zonas z ON z.id = s.zona_id
       WHERE d.nombre_completo LIKE :qq OR t.dni LIKE :qq
       ORDER BY d.id DESC
       LIMIT 20`,
      { qq: `%${q}%` }
    );
    return res.json({ ok: true, items });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

app.get('/search/concesiones', requireToken, async (req, res) => {
  const q = String(req.query.q ?? '').trim();
  if (q.length < 2) return res.json({ ok: true, items: [] });
  try {
    const [items] = await pool.query(
      `SELECT c.id, c.sepultura_id, c.numero_expediente, c.tipo, c.fecha_concesion, c.fecha_vencimiento, c.duracion_anos, c.estado,
              s.codigo AS sepultura_codigo, b.nombre AS bloque_nombre, z.nombre AS zona_nombre,
              CONCAT_WS(' ', t.nombre, t.apellido1, t.apellido2) AS concesionario, t.dni AS concesionario_dni
       FROM cemn_concesiones c
       LEFT JOIN cemn_sepulturas s ON s.id = c.sepultura_id
       LEFT JOIN cemn_bloques b ON b.id = s.bloque_id
       LEFT JOIN cemn_zonas z ON z.id = s.zona_id
       LEFT JOIN cemn_concesion_terceros ct ON ct.concesion_id = c.id AND ct.rol='concesionario'
       LEFT JOIN cemn_terceros t ON t.id = ct.tercero_id
       WHERE t.dni LIKE :qq OR t.nombre LIKE :qq OR t.apellido1 LIKE :qq OR t.apellido2 LIKE :qq
       ORDER BY c.id DESC
       LIMIT 20`,
      { qq: `%${q}%` }
    );
    return res.json({ ok: true, items });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

// ---- Workflows transaccionales (MySQL) ----

const InhumacionBody = z.object({
  sepultura_id: z.number().int().positive(),
  nombre_completo: z.string().min(1),
  fecha_fallecimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  fecha_inhumacion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  es_titular: z.boolean().optional().default(true),
  parentesco: z.string().nullable().optional(),
  notas: z.string().nullable().optional()
});

app.post('/workflows/inhumacion', requireToken, async (req, res) => {
  const parsed = InhumacionBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  const b = parsed.data;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // bloquear sepultura para evitar carreras
    await conn.query('SELECT id, estado FROM cemn_sepulturas WHERE id = :id FOR UPDATE', { id: b.sepultura_id });

    const [dif] = await conn.query(
      `INSERT INTO cemn_difuntos
        (tercero_id, nombre_completo, fecha_fallecimiento, fecha_inhumacion, sepultura_id, es_titular, parentesco, notas)
       VALUES
        (NULL, :nombre, :ff, :fi, :sid, :tit, :par, :not)`,
      {
        sid: b.sepultura_id,
        nombre: b.nombre_completo.trim(),
        ff: b.fecha_fallecimiento ?? null,
        fi: b.fecha_inhumacion ?? null,
        tit: b.es_titular ? 1 : 0,
        par: (b.parentesco ?? '').trim() || null,
        not: (b.notas ?? '').trim() || null
      }
    );

    const difunto_id = dif.insertId;

    await conn.query('UPDATE cemn_sepulturas SET estado = "ocupada" WHERE id = :id', { id: b.sepultura_id });

    const [mov] = await conn.query(
      `INSERT INTO cemn_movimientos
        (difunto_id, tipo, fecha, sepultura_origen_id, sepultura_destino_id, numero_expediente, notas)
       VALUES
        (:difunto_id, "inhumacion", :fecha, :origen, NULL, NULL, NULL)`,
      {
        difunto_id,
        fecha: b.fecha_inhumacion ?? null,
        origen: b.sepultura_id
      }
    );

    await conn.commit();
    return res.json({ ok: true, difunto_id, movimiento_id: mov.insertId });
  } catch (e) {
    try { await conn.rollback(); } catch {}
    return res.status(500).json({ ok: false, error: String(e) });
  } finally {
    conn.release();
  }
});

const ExhumacionBody = z.object({
  sepultura_id: z.number().int().positive(),
  difunto_id: z.number().int().positive(),
  tipo: z.enum(['exhumacion', 'traslado']),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notas: z.string().nullable().optional(),
  sepultura_destino_id: z.number().int().positive().nullable().optional()
});

app.post('/workflows/exhumacion', requireToken, async (req, res) => {
  const parsed = ExhumacionBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  const b = parsed.data;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query('SELECT id FROM cemn_sepulturas WHERE id = :id FOR UPDATE', { id: b.sepultura_id });

    const [mov] = await conn.query(
      `INSERT INTO cemn_movimientos
        (difunto_id, tipo, fecha, sepultura_origen_id, sepultura_destino_id, numero_expediente, notas)
       VALUES
        (:difunto_id, :tipo, :fecha, :origen, :destino, NULL, :notas)`,
      {
        difunto_id: b.difunto_id,
        tipo: b.tipo,
        fecha: b.fecha ?? null,
        origen: b.sepultura_id,
        destino: b.sepultura_destino_id ?? null,
        notas: (b.notas ?? '').trim() || null
      }
    );

    // “sale del nicho”
    await conn.query(
      'UPDATE cemn_difuntos SET sepultura_id = NULL WHERE id = :difunto_id AND sepultura_id = :sid',
      { difunto_id: b.difunto_id, sid: b.sepultura_id }
    );

    const [rest] = await conn.query('SELECT COUNT(*) as c FROM cemn_difuntos WHERE sepultura_id = :sid', { sid: b.sepultura_id });
    const restantes = Number(rest?.[0]?.c ?? 0);
    if (restantes === 0) {
      await conn.query('UPDATE cemn_sepulturas SET estado = "libre" WHERE id = :sid', { sid: b.sepultura_id });
    }

    await conn.commit();
    return res.json({ ok: true, movimiento_id: mov.insertId, restantes });
  } catch (e) {
    try { await conn.rollback(); } catch {}
    return res.status(500).json({ ok: false, error: String(e) });
  } finally {
    conn.release();
  }
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[mysql-api] listening on :${port}`);
});

