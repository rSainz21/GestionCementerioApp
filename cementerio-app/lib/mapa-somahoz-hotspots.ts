export type SomahozHotspotId = 'A_B6' | 'B_B7' | 'C_B8' | 'D_AMPLIACIONES' | 'E_COLUMBARIOS' | 'TANATORIO';

export type HotspotPolygon = {
  id: SomahozHotspotId;
  label: string;
  // puntos en el mismo sistema 0..1000 del `CementerioMapa`
  points: Array<{ x: number; y: number }>;
  // si true, no navega; solo muestra tooltip (tanatorio)
  inactive?: boolean;
};

// Nota: estos puntos están calibrados para `assets/images/mapa-somahoz-ortho.png`
// renderizada en un viewBox 0..1000.
export const SOMAHOZ_HOTSPOTS: HotspotPolygon[] = [
  // Polígono A — Tejado 6 (abajo izquierda, muro sur entrada) => Bloque 6
  {
    id: 'A_B6',
    label: 'Bloque 6',
    points: [
      { x: 365, y: 740 },
      { x: 462, y: 705 },
      { x: 515, y: 860 },
      { x: 410, y: 900 },
    ],
  },
  // Polígono B — Tejado 7 (centro sur) => Bloque 7
  {
    id: 'B_B7',
    label: 'Bloque 7',
    points: [
      { x: 520, y: 805 },
      { x: 700, y: 755 },
      { x: 730, y: 855 },
      { x: 555, y: 910 },
    ],
  },
  // Polígono C — Tejado alargado 8 (abajo derecha) => Bloque 8
  {
    id: 'C_B8',
    label: 'Bloque 8',
    points: [
      { x: 720, y: 820 },
      { x: 905, y: 770 },
      { x: 940, y: 860 },
      { x: 765, y: 920 },
    ],
  },
  // Polígono D — Campa central (contorno azul grande) => submenu ampliaciones
  {
    id: 'D_AMPLIACIONES',
    label: 'Ampliaciones',
    points: [
      { x: 610, y: 120 },
      { x: 920, y: 250 },
      { x: 865, y: 600 },
      { x: 560, y: 610 },
      { x: 525, y: 310 },
    ],
  },
  // Polígono E — Columbarios (tejados 4 y 5) => grid columbarios
  {
    id: 'E_COLUMBARIOS',
    label: 'Columbarios',
    points: [
      { x: 470, y: 600 },
      { x: 585, y: 565 },
      { x: 630, y: 705 },
      { x: 505, y: 750 },
    ],
  },
  // Zona excluida — Tanatorio (izquierda de la línea roja)
  {
    id: 'TANATORIO',
    label: 'Tanatorio (Fuera de recinto)',
    inactive: true,
    points: [
      { x: 0, y: 0 },
      { x: 520, y: 0 },
      { x: 410, y: 1000 },
      { x: 0, y: 1000 },
    ],
  },
];

