/** Expo Router / web pueden devolver string | string[] en search params */
export function firstParam(v: string | string[] | undefined): string {
  if (v === undefined || v === null) return '';
  return Array.isArray(v) ? (v[0] ?? '') : v;
}
