export function toApiErrorMessage(e, fallback = 'Error al guardar.') {
  return e?.response?.data?.message ?? fallback;
}

