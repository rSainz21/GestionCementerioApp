/**
 * Normaliza la respuesta de GET /api/cementerio/stats para todos los clientes.
 * El backend puede omitir `total`; en ese caso se usa la suma de estados conocidos.
 */
export type CementerioStatsNormalized = {
  libres: number;
  ocupadas: number;
  reservadas: number;
  clausuradas: number;
  mantenimiento: number;
  total: number;
};

export function normalizeCementerioStatsFromApi(raw: unknown): CementerioStatsNormalized {
  const it = (raw as any)?.items ?? raw ?? {};
  const libres = Number(it.libres ?? 0);
  const ocupadas = Number(it.ocupadas ?? it.ocupados ?? 0);
  const reservadas = Number(it.reservadas ?? 0);
  const clausuradas = Number(it.clausuradas ?? 0);
  const mantenimiento = Number(it.mantenimiento ?? 0);
  const sumEstados = libres + ocupadas + reservadas + clausuradas + mantenimiento;
  const fromApi = Number(it.total ?? it.sepulturas_total ?? 0);
  const total = fromApi > 0 ? fromApi : sumEstados;
  return { libres, ocupadas, reservadas, clausuradas, mantenimiento, total };
}
