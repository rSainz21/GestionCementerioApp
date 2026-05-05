export function toApiErrorMessage(e, fallback = 'Error al guardar.') {
  const d = e?.response?.data;
  if (typeof d?.message === 'string' && d.message) return d.message;
  if (d?.errors && typeof d.errors === 'object') {
    const first = Object.values(d.errors).flat().find(Boolean);
    if (first) return String(first);
  }
  return fallback;
}
