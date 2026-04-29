/**
 * Corrige textos con mojibake típico (UTF-8 leído como Latin-1 / Windows-1252).
 * No sustituye datos bien codificados.
 */
export function fixDisplayText(value) {
  if (value == null || value === '') return value;
  let s = String(value);
  if (!/[ÃÂ\uFFFD]|\?\?/.test(s)) return s;
  try {
    if (/Ã[\u0080-\u00BF]|Â[\u0080-\u00BF]/.test(s)) {
      s = decodeURIComponent(escape(s));
    }
  } catch {
    /* mantener original */
  }
  s = s.replace(/\uFFFD\uFFFD/g, 'ó');
  s = s.replace(/\uFFFD/g, '');
  s = s.replace(/Ampliaci\?\?n/gi, 'Ampliación');
  s = s.replace(/Renovaci\?\?n/gi, 'Renovación');
  return s.trim() || value;
}
