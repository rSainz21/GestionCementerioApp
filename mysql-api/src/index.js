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

