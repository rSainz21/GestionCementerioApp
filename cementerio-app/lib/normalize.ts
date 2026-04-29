import type { Concesion, Difunto, Sepultura } from './types';

/** Respuesta típica del backend del compañero: { item: {...} } */
export function unwrapItem<T>(data: any): T | null {
  if (!data) return null;
  if (typeof data === 'object' && 'item' in data && data.item && typeof data.item === 'object') {
    return data.item as T;
  }
  return data as T;
}

export function pickConcesionVigente(sep: any): Concesion | null {
  if (!sep) return null;
  return (sep.concesion_activa ?? sep.concesion ?? sep.concesion_vigente ?? null) as Concesion | null;
}

export function pickTitularFromConcesion(conc: any): any | null {
  if (!conc) return null;
  if (conc.titular) return conc.titular;
  const terceros: any[] = Array.isArray(conc.terceros) ? conc.terceros : [];
  const t =
    terceros.find((x) => x?.pivot?.rol === 'concesionario' && (x?.pivot?.activo === 1 || x?.pivot?.activo === true)) ??
    terceros[0];
  return t ?? null;
}

export function pickDifuntos(sep: any): Difunto[] {
  if (!sep) return [];
  const ds: Difunto[] = Array.isArray(sep.difuntos) ? sep.difuntos : [];
  if (ds.length > 0) return ds;
  if (sep.difunto_titular) return [sep.difunto_titular as Difunto];
  return [];
}

export function asSepulturaBase(sep: any): Sepultura | null {
  const s = unwrapItem<Sepultura>(sep);
  if (!s) return null;
  return s;
}

