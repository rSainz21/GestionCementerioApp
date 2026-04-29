export type YellowMarker = {
  id: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';
  // acción semántica
  action: 'tanatorio' | 'columbarios' | 'bloque';
  codigoBloque?: string;
  vb: { x: number; y: number }; // en 0..1000 (mismo sistema del SVG)
};

/**
 * Posiciones fijadas para que coincidan con los números amarillos del PNG de referencia.
 * Coordenadas en viewBox 0..1000.
 */
export const SOMAHOZ_YELLOW_MARKERS: YellowMarker[] = [
  // Tanatorio (1/2/3) — zona izquierda (no interactivo)
  { id: '1', action: 'tanatorio', vb: { x: 547, y: 219 } },
  { id: '2', action: 'tanatorio', vb: { x: 357, y: 438 } },
  { id: '3', action: 'tanatorio', vb: { x: 312, y: 646 } },

  // Columbarios (4/5)
  { id: '5', action: 'columbarios', vb: { x: 413, y: 531 } },
  { id: '4', action: 'columbarios', vb: { x: 457, y: 594 } },

  // Bloques muro sur (6/7/8)
  { id: '6', action: 'bloque', codigoBloque: 'B6', vb: { x: 446, y: 729 } },
  { id: '7', action: 'bloque', codigoBloque: 'B7', vb: { x: 580, y: 854 } },
  { id: '8', action: 'bloque', codigoBloque: 'B8', vb: { x: 748, y: 729 } },
];

