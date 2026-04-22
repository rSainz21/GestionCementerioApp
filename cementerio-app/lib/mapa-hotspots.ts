export type Hotspot = {
  codigo: string;
  label: string;
  /**
   * Posición relativa (porcentaje 0..100) sobre la imagen.
   * Ajusta a ojo hasta encajar.
   */
  xPct: number;
  yPct: number;
};

// Coordenadas iniciales (ajústalas “a ojo” en el visor).
export const HOTSPOTS_SOMAHOZ: Hotspot[] = [
  // Coordenadas iniciales para `assets/images/mapa-somahoz-pnoa.jpg` (recorte del recinto)
  { codigo: 'B2001', label: 'B2001', xPct: 56, yPct: 22 },
  { codigo: 'BA', label: 'BA', xPct: 52, yPct: 38 },

  // Muro Sur (principal)
  // B8 estaba cayendo en el prado: lo movemos dentro del bloque grande de nichos (derecha)
  { codigo: 'B8', label: 'B8', xPct: 67, yPct: 40 },
  { codigo: 'B7', label: 'B7', xPct: 62, yPct: 52 },
  { codigo: 'B6', label: 'B6', xPct: 58, yPct: 60 },

  // Ampliaciones (aprox. sobre los bloques reales del perímetro inferior)
  // Grupo inferior: lo acercamos al pasillo inferior (subir un poco y compactar)
  { codigo: 'B2007', label: 'B2007', xPct: 61, yPct: 58 },
  { codigo: 'B2017', label: 'B2017', xPct: 65, yPct: 58 },
  { codigo: 'BD', label: 'BD', xPct: 69, yPct: 58 },
  { codigo: 'B2020', label: 'B2020', xPct: 65, yPct: 64 },
  { codigo: 'B2025', label: 'B2025', xPct: 66, yPct: 69 },
];

