export type ZonaLabel = 'ZONA VIEJA' | 'ZONA NUEVA';

export type BloqueOficial = {
  codigo: string;
  nombre: string;
  filas: 4;
  columnas: number;
  rango: [number, number];
  zonaLabel: ZonaLabel;
};

export const BLOQUES_OFICIALES: BloqueOficial[] = [
  // 🧱 ZONA VIEJA (Muro Sur)
  { codigo: 'B6', nombre: 'Bloque 6 - Muro Sur', filas: 4, columnas: 10, rango: [1, 40], zonaLabel: 'ZONA VIEJA' },
  { codigo: 'B7', nombre: 'Bloque 7 - Muro Sur', filas: 4, columnas: 14, rango: [41, 96], zonaLabel: 'ZONA VIEJA' },
  { codigo: 'B8', nombre: 'Bloque 8 - Muro Sur', filas: 4, columnas: 32, rango: [97, 224], zonaLabel: 'ZONA VIEJA' },

  // 🏗️ ZONA NUEVA (Ampliaciones)
  { codigo: 'BA', nombre: 'Ampliación A', filas: 4, columnas: 10, rango: [225, 264], zonaLabel: 'ZONA NUEVA' },
  { codigo: 'B2001', nombre: 'Ampliación 2001 - Muro Norte', filas: 4, columnas: 13, rango: [265, 316], zonaLabel: 'ZONA NUEVA' },
  { codigo: 'B2007', nombre: 'Ampliación 2007 - Exento', filas: 4, columnas: 10, rango: [317, 356], zonaLabel: 'ZONA NUEVA' },
  { codigo: 'BD', nombre: 'Ampliación D', filas: 4, columnas: 13, rango: [357, 408], zonaLabel: 'ZONA NUEVA' },
  { codigo: 'B2017', nombre: 'Ampliación 2017', filas: 4, columnas: 10, rango: [409, 448], zonaLabel: 'ZONA NUEVA' },
  { codigo: 'B2020', nombre: 'Ampliación 2020', filas: 4, columnas: 6, rango: [449, 472], zonaLabel: 'ZONA NUEVA' },
  { codigo: 'B2025', nombre: 'Ampliación 2025', filas: 4, columnas: 12, rango: [473, 520], zonaLabel: 'ZONA NUEVA' },
];

export function formatRango([a, b]: [number, number]) {
  return `${a}–${b}`;
}

