import type { BloqueOficial } from './bloques-oficiales';
import type { PoligonoBloque } from './mapa-somahoz';

export type PlanoBlock = {
  codigo: string;
  label: string;
  units: number;
  filas?: number;
  columnas?: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

function shortLabel(nombre: string, codigo: string) {
  const n = String(nombre ?? '').trim();
  if (!n) return codigo;
  // "Bloque 8 - Muro Sur" -> "Muro Sur", "Ampliación 2001 - Muro Norte" -> "Muro Norte"
  const parts = n.split(' - ').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return parts.slice(1).join(' - ');
  return n;
}

export function buildPlanoBlocksSomahoz({
  bloquesOficiales,
  bloquesRaw,
  poligonos,
  crop,
  margin = 70,
  pad = 14,
}: {
  bloquesOficiales: BloqueOficial[];
  bloquesRaw: any[];
  poligonos: PoligonoBloque[];
  crop: { x: number; y: number; w: number; h: number };
  margin?: number;
  pad?: number;
}): PlanoBlock[] {
  const raw = Array.isArray(bloquesRaw) ? bloquesRaw : [];
  const byCode = new Map<string, any>(raw.map((b) => [String(b?.codigo ?? '').trim(), b]));
  const polysByCode = new Map(poligonos.map((p) => [p.codigo, p]));

  const tmp: Array<{
    codigo: string;
    label: string;
    units: number;
    filas?: number;
    columnas?: number;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  }> = [];

  for (const b of bloquesOficiales) {
    const code = String(b.codigo ?? '').trim();
    if (!code) continue;
    const poly = polysByCode.get(code);
    if (!poly) continue;

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const p of poly.puntos) {
      const nx = ((p.x - crop.x) / crop.w) * 1000;
      const ny = ((p.y - crop.y) / crop.h) * 1000;
      minX = Math.min(minX, nx);
      minY = Math.min(minY, ny);
      maxX = Math.max(maxX, nx);
      maxY = Math.max(maxY, ny);
    }

    const meta = byCode.get(code) ?? null;
    const filas = Number(meta?.filas ?? b.filas ?? 0) || undefined;
    const columnas = Number(meta?.columnas ?? b.columnas ?? 0) || undefined;
    const units = filas && columnas ? filas * columnas : Number(meta?.unidades ?? 0) || b.filas * b.columnas;
    tmp.push({
      codigo: code,
      label: shortLabel(b.nombre, code),
      units,
      filas,
      columnas,
      minX,
      minY,
      maxX,
      maxY,
    });
  }

  if (tmp.length === 0) return [];

  // Fit-to-canvas: escalado uniforme + centrado con márgenes.
  let gMinX = Number.POSITIVE_INFINITY;
  let gMinY = Number.POSITIVE_INFINITY;
  let gMaxX = Number.NEGATIVE_INFINITY;
  let gMaxY = Number.NEGATIVE_INFINITY;
  for (const b of tmp) {
    gMinX = Math.min(gMinX, b.minX);
    gMinY = Math.min(gMinY, b.minY);
    gMaxX = Math.max(gMaxX, b.maxX);
    gMaxY = Math.max(gMaxY, b.maxY);
  }
  const spanX = Math.max(1e-6, gMaxX - gMinX);
  const spanY = Math.max(1e-6, gMaxY - gMinY);
  const usable = 1000 - margin * 2;
  const scale = Math.min(usable / spanX, usable / spanY);

  const usedW = spanX * scale;
  const usedH = spanY * scale;
  const offX = (1000 - usedW) / 2;
  const offY = (1000 - usedH) / 2;

  return tmp
    .map((b) => {
      const x = offX + (b.minX - gMinX) * scale;
      const y = offY + (b.minY - gMinY) * scale;
      const w = (b.maxX - b.minX) * scale;
      const h = (b.maxY - b.minY) * scale;
      return {
        codigo: b.codigo,
        label: b.label,
        units: b.units,
        filas: b.filas,
        columnas: b.columnas,
        x: x - pad,
        y: y - pad,
        w: w + pad * 2,
        h: h + pad * 2,
      } satisfies PlanoBlock;
    })
    // Bloques pequeños arriba para mejor “tap”
    .sort((a, b) => a.w * a.h - b.w * b.h);
}

