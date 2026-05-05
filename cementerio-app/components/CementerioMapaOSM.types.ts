import type { HotspotPolygon, SomahozHotspotId } from '@/lib/mapa-somahoz-hotspots';
import type { BloqueOficial } from '@/lib/bloques-oficiales';
import type { Sepultura } from '@/lib/types';

export type CementerioMapaOSMProps = {
  height: number;
  hotspots: HotspotPolygon[];
  activeHotspotId?: SomahozHotspotId | null;
  onPressHotspot?: (id: SomahozHotspotId) => void;
  blocks: BloqueOficial[];
  selectedCodigo?: string | null;
  onPressBlock: (codigo: string) => void;
  allGrids?: Array<{ codigo: string; filas: number; columnas: number }> | null;
  selectedSepulturas?: Sepultura[];
  selectedGrid?: { filas: number; columnas: number } | null;
  highlightSepulturaId?: number | null;
  userLocation?: { latitude: number; longitude: number } | null;
  userAccuracyM?: number | null;
  customBloques?: Array<{ codigo: string; coordinates: Array<{ latitude: number; longitude: number }> }> | null;
  onPressYellowMarker?: (id: string) => void;
  yellowReloadNonce?: number;
  estadoFiltro?: 'todos' | 'libre' | 'ocupada' | 'reservada' | 'clausurada';
  geoSepulturas?: Array<{
    id: number;
    numero: number | null;
    lat: number;
    lon: number;
    tipo: string;
    estado?: string | null;
    titular?: string | null;
    bloque_codigo?: string | null;
    zona_nombre?: string | null;
  }>;
  allowDragGeoSepulturas?: boolean;
  onDragGeoSepultura?: (id: number, latitude: number, longitude: number) => void;
  onMapCenterChange?: (latitude: number, longitude: number) => void;
  onPressGeoSepultura?: (id: number) => void;
  highlightGeoSepulturaId?: number | null;
};
