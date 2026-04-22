/** Estados que la app permite asignar */
export type EstadoSepultura = 'libre' | 'ocupada';

/** Valores que pueden existir en PostgreSQL (histórico); en UI se normalizan a libre/ocupada */
export type EstadoSepulturaDb = EstadoSepultura | 'reservada' | 'clausurada';
export type TipoSepultura = 'sepultura' | 'nicho' | 'columbario' | 'panteon';
export type TipoConcesion = 'perpetua' | 'temporal';
export type EstadoConcesion = 'vigente' | 'caducada' | 'renovada' | 'transferida' | 'anulada';

export interface Zona {
  id: number;
  codigo: string;
  nombre: string;
  lat?: number | null;
  lon?: number | null;
}

export interface Bloque {
  id: number;
  zona_id: number;
  codigo: string;
  filas: number;
  columnas: number;
  zona?: Zona;
  lat?: number | null;
  lon?: number | null;
}

export interface Sepultura {
  id: number;
  zona_id: number;
  bloque_id: number | null;
  tipo: TipoSepultura;
  numero: number | null;
  fila: number | null;
  columna: number | null;
  codigo: string | null;
  estado: EstadoSepulturaDb;
  ubicacion_texto: string | null;
  notas: string | null;
  lat?: number | null;
  lon?: number | null;
  difuntos?: Difunto[];
  concesiones?: Concesion[];
  bloque?: Bloque;
}

export interface Tercero {
  id: number;
  dni: string | null;
  nombre: string;
  apellido1: string | null;
  apellido2: string | null;
}

export interface Difunto {
  id: number;
  tercero_id: number | null;
  nombre_completo: string;
  fecha_fallecimiento: string | null;
  sepultura_id: number | null;
  es_titular: boolean;
  tercero?: Tercero;
  sepultura?: Sepultura;
}

export interface Concesion {
  id: number;
  sepultura_id: number;
  numero_expediente: string | null;
  tipo: TipoConcesion;
  estado: EstadoConcesion;
}

export type Database = {
  public: {
    Tables: {
      cemn_zonas: {
        Row: Zona;
        Insert: { codigo: string; nombre: string };
        Update: { codigo?: string; nombre?: string };
        Relationships: [];
      };
      cemn_bloques: {
        Row: Bloque;
        Insert: { zona_id: number; codigo: string; filas: number; columnas: number };
        Update: { zona_id?: number; codigo?: string; filas?: number; columnas?: number };
        Relationships: [{ foreignKeyName: 'cemn_bloques_zona_id_fkey'; columns: ['zona_id']; referencedRelation: 'cemn_zonas'; referencedColumns: ['id'] }];
      };
      cemn_sepulturas: {
        Row: Sepultura;
        Insert: {
          zona_id: number;
          bloque_id?: number | null;
          tipo?: TipoSepultura;
          numero?: number | null;
          fila?: number | null;
          columna?: number | null;
          codigo?: string | null;
          estado?: EstadoSepultura;
          ubicacion_texto?: string | null;
          notas?: string | null;
        };
        Update: {
          zona_id?: number;
          bloque_id?: number | null;
          tipo?: TipoSepultura;
          numero?: number | null;
          fila?: number | null;
          columna?: number | null;
          codigo?: string | null;
          estado?: EstadoSepultura;
          ubicacion_texto?: string | null;
          notas?: string | null;
        };
        Relationships: [
          { foreignKeyName: 'cemn_sepulturas_zona_id_fkey'; columns: ['zona_id']; referencedRelation: 'cemn_zonas'; referencedColumns: ['id'] },
          { foreignKeyName: 'cemn_sepulturas_bloque_id_fkey'; columns: ['bloque_id']; referencedRelation: 'cemn_bloques'; referencedColumns: ['id'] },
        ];
      };
      cemn_terceros: {
        Row: Tercero;
        Insert: { dni?: string | null; nombre: string; apellido1?: string | null; apellido2?: string | null };
        Update: { dni?: string | null; nombre?: string; apellido1?: string | null; apellido2?: string | null };
        Relationships: [];
      };
      cemn_difuntos: {
        Row: Difunto;
        Insert: {
          tercero_id?: number | null;
          nombre_completo: string;
          fecha_fallecimiento?: string | null;
          sepultura_id?: number | null;
          es_titular?: boolean;
        };
        Update: {
          tercero_id?: number | null;
          nombre_completo?: string;
          fecha_fallecimiento?: string | null;
          sepultura_id?: number | null;
          es_titular?: boolean;
        };
        Relationships: [
          { foreignKeyName: 'cemn_difuntos_tercero_id_fkey'; columns: ['tercero_id']; referencedRelation: 'cemn_terceros'; referencedColumns: ['id'] },
          { foreignKeyName: 'cemn_difuntos_sepultura_id_fkey'; columns: ['sepultura_id']; referencedRelation: 'cemn_sepulturas'; referencedColumns: ['id'] },
        ];
      };
      cemn_concesiones: {
        Row: Concesion;
        Insert: {
          sepultura_id: number;
          numero_expediente?: string | null;
          tipo?: TipoConcesion;
          estado?: EstadoConcesion;
        };
        Update: {
          sepultura_id?: number;
          numero_expediente?: string | null;
          tipo?: TipoConcesion;
          estado?: EstadoConcesion;
        };
        Relationships: [
          { foreignKeyName: 'cemn_concesiones_sepultura_id_fkey'; columns: ['sepultura_id']; referencedRelation: 'cemn_sepulturas'; referencedColumns: ['id'] },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      estado_sepultura: EstadoSepulturaDb;
      tipo_sepultura: TipoSepultura;
      tipo_concesion: TipoConcesion;
      estado_concesion: EstadoConcesion;
    };
  };
};
