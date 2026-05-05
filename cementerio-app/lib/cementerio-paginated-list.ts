import { apiFetch } from '@/lib/laravel-api';

type ListResponse = {
  items?: unknown[];
  meta?: { page?: number; per_page?: number; has_more?: boolean };
};

function asItems(data: unknown): any[] {
  if (!data || typeof data !== 'object') return [];
  const d = data as Record<string, unknown>;
  if (Array.isArray(d.items)) return d.items as any[];
  return [];
}

/**
 * Recorre todas las páginas de un listado `/api/cementerio/{concesiones|terceros|difuntos}`.
 * - Sin `q` (o &lt;2 chars en servidor): hasta `limit` por página (máx. 500 en API).
 * - Con `q` de 2+ caracteres: el backend limita a 100 filas por página; se pagina hasta vacío.
 */
export async function fetchCementerioListAllPages(opts: {
  pathNoQuery: string;
  q: string;
  limit?: number;
  maxPages?: number;
  maxItems?: number;
}): Promise<{ items: any[]; ok: boolean; error?: string }> {
  const limit = opts.limit ?? 500;
  const maxPages = opts.maxPages ?? 200;
  const maxItems = opts.maxItems ?? 25000;
  const qRaw = String(opts.q ?? '').trim();
  const qParam = qRaw.length >= 2 ? `&q=${encodeURIComponent(qRaw)}` : '';
  const perPageGuess = qRaw.length >= 2 ? Math.min(limit, 100) : limit;

  const byId = new Map<number, any>();
  let page = 1;

  while (page <= maxPages && byId.size < maxItems) {
    const url = `${opts.pathNoQuery}?limit=${limit}&page=${page}${qParam}`;
    const r = await apiFetch<ListResponse>(url);
    if (!r.ok) {
      return {
        items: [...byId.values()],
        ok: false,
        error: typeof r.error === 'string' ? r.error : JSON.stringify(r.error),
      };
    }

    const items = asItems(r.data);
    const meta = (r.data as ListResponse | undefined)?.meta;
    const perPage =
      typeof meta?.per_page === 'number' && meta.per_page > 0 ? meta.per_page : perPageGuess;

    const sizeBefore = byId.size;
    for (const it of items) {
      const id = Number((it as any)?.id);
      if (!Number.isFinite(id)) continue;
      byId.set(id, it);
    }
    if (page > 1 && items.length > 0 && byId.size === sizeBefore) {
      break;
    }

    const hasMore =
      meta?.has_more === true || (meta?.has_more !== false && items.length > 0 && items.length >= perPage);

    if (!hasMore) break;
    page += 1;
  }

  return { items: [...byId.values()], ok: true };
}
