export type Punto = { x: number; y: number };

export type PoligonoBloque = {
  codigo: string;
  puntos: Punto[];
};

/**
 * Coordenadas NORMALIZADAS para un `viewBox` 0 0 1000 1000.
 * Ajusta los puntos hasta que encajen con tu imagen base.
 *
 * Nota: ahora mismo son una aproximación inicial para poder
 * tener ya el mapa interactivo funcionando "end-to-end".
 */
export const POLIGONOS_BLOQUES_SOMAHOZ: PoligonoBloque[] = [
  /**
   * Ajuste para `assets/images/unnamed.png`:
   * - La ortofoto está centrada y el resto es margen blanco.
   * - Estos polígonos están dibujados para el viewBox 0..1000 y deben
   *   "caer" encima de los trazos rojo/azul del propio PNG.
   *
   * Importante: cuando se use `CementerioMapa` con `crop`,
   * mantener (x:255 y:205 w:500 h:500) para que encaje.
   */

  // Coordenadas afinadas para `unnamed.png` con crop (x:255 y:205 w:500 h:500)
  // Muro Norte (B2001): banda superior
  { codigo: 'B2001', puntos: [{ x: 420, y: 290 }, { x: 755, y: 290 }, { x: 755, y: 325 }, { x: 420, y: 325 }] },

  // Zona vieja — muro sur (bloque grande de nichos a la derecha)
  { codigo: 'B8', puntos: [{ x: 640, y: 330 }, { x: 820, y: 330 }, { x: 820, y: 615 }, { x: 640, y: 615 }] },

  // Tramos del muro sur junto a edificios (dos rectángulos estrechos)
  { codigo: 'B7', puntos: [{ x: 595, y: 465 }, { x: 640, y: 465 }, { x: 640, y: 585 }, { x: 595, y: 585 }] },
  { codigo: 'B6', puntos: [{ x: 565, y: 525 }, { x: 595, y: 525 }, { x: 595, y: 615 }, { x: 565, y: 615 }] },

  // Ampliación A (BA): columna vertical estrecha en el centro (marcada en azul)
  { codigo: 'BA', puntos: [{ x: 560, y: 340 }, { x: 625, y: 340 }, { x: 625, y: 495 }, { x: 560, y: 495 }] },

  // Ampliación 2007 (exento): bloque con tejado (centro inferior)
  { codigo: 'B2007', puntos: [{ x: 585, y: 625 }, { x: 635, y: 625 }, { x: 635, y: 695 }, { x: 585, y: 695 }] },

  // Ampliación D (BD): bloque a la derecha del exento
  { codigo: 'BD', puntos: [{ x: 735, y: 620 }, { x: 805, y: 620 }, { x: 805, y: 705 }, { x: 735, y: 705 }] },

  // Ampliaciones (2017/2020/2025): bloque inferior-derecha (tres piezas)
  { codigo: 'B2017', puntos: [{ x: 640, y: 610 }, { x: 710, y: 610 }, { x: 710, y: 690 }, { x: 640, y: 690 }] },
  { codigo: 'B2020', puntos: [{ x: 640, y: 695 }, { x: 690, y: 695 }, { x: 690, y: 745 }, { x: 640, y: 745 }] },
  { codigo: 'B2025', puntos: [{ x: 640, y: 750 }, { x: 720, y: 750 }, { x: 720, y: 810 }, { x: 640, y: 810 }] },
];

