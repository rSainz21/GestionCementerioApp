import { POLIGONOS_BLOQUES_SOMAHOZ } from '@/lib/mapa-somahoz';
import { SOMAHOZ_HOTSPOTS } from '@/lib/mapa-somahoz-hotspots';

export type LatLon = { latitude: number; longitude: number };

// BBox OSM (Nominatim) del recinto
export const SOMAHOZ_BBOX = {
  south: 43.2483426,
  north: 43.2491123,
  west: -4.0582794,
  east: -4.0575471,
};

export function vbToLatLon(p: { x: number; y: number }): LatLon {
  const longitude = SOMAHOZ_BBOX.west + (p.x / 1000) * (SOMAHOZ_BBOX.east - SOMAHOZ_BBOX.west);
  const latitude = SOMAHOZ_BBOX.north - (p.y / 1000) * (SOMAHOZ_BBOX.north - SOMAHOZ_BBOX.south);
  return { latitude, longitude };
}

export const SOMAHOZ_BLOQUES_LATLON = POLIGONOS_BLOQUES_SOMAHOZ.map((b) => ({
  codigo: b.codigo,
  coordinates: b.puntos.map(vbToLatLon),
}));

export const SOMAHOZ_HOTSPOTS_LATLON = SOMAHOZ_HOTSPOTS.map((h) => ({
  ...h,
  coordinates: h.points.map(vbToLatLon),
}));

// GeoJSON (útil si quieres exportar a herramientas GIS)
export const SOMAHOZ_BLOQUES_GEOJSON = {
  type: 'FeatureCollection',
  features: POLIGONOS_BLOQUES_SOMAHOZ.map((b) => ({
    type: 'Feature',
    properties: { codigo: b.codigo },
    geometry: {
      type: 'Polygon',
      // GeoJSON usa [lon,lat]
      coordinates: [[...b.puntos.map((p) => {
        const ll = vbToLatLon(p);
        return [ll.longitude, ll.latitude];
      }), (() => {
        const first = vbToLatLon(b.puntos[0]);
        return [first.longitude, first.latitude];
      })()]],
    },
  })),
} as const;

