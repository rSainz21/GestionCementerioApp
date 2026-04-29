<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Cementerio de Somahoz — coordenadas aproximadas del recinto.
     *
     * Distribución orientativa dentro del recinto:
     *   · Fila de nichos norte (parte superior):  lat ≈ 43.25460–43.25475
     *   · Fila de nichos sur   (parte inferior):  lat ≈ 43.25425–43.25440
     *   · Columbarios (bloque oeste):              lon ≈ -4.04960
     *   · Panteones / fosas (zona central):        lat/lon centrales
     */
    private const CEM_LAT = 43.25445;
    private const CEM_LON = -4.04920;

    // Puntos de muestra: [latitud, longitud, número de nicho/sepultura]
    // Distribuidos dentro de la malla visible en el mapa (~80×80 m)
    private const NICHOS = [
        [43.25470, -4.04870, 1],
        [43.25462, -4.04880, 5],
        [43.25454, -4.04880, 9],
        [43.25470, -4.04905, 13],
        [43.25462, -4.04905, 17],
    ];

    private const FOSAS = [
        [43.25438, -4.04925, null],
        [43.25432, -4.04930, null],
        [43.25428, -4.04920, null],
    ];

    private const COLUMBARIOS = [
        [43.25455, -4.04955, null],
        [43.25448, -4.04955, null],
        [43.25441, -4.04955, null],
    ];

    public function up(): void
    {
        // Nichos (tipo nicho): asignar coords por número de sepultura
        foreach (self::NICHOS as [$lat, $lon, $numero]) {
            $q = DB::table('cemn_sepulturas')->where('tipo', 'nicho');
            if ($numero !== null) {
                $q->where('numero', $numero);
            }
            $row = $q->whereNull('lat')->first();
            if ($row) {
                DB::table('cemn_sepulturas')->where('id', $row->id)->update([
                    'lat' => $lat,
                    'lon' => $lon,
                ]);
            }
        }

        // Fosas
        foreach (self::FOSAS as [$lat, $lon]) {
            $row = DB::table('cemn_sepulturas')
                ->where('tipo', 'fosa')
                ->whereNull('lat')
                ->first();
            if ($row) {
                DB::table('cemn_sepulturas')->where('id', $row->id)->update([
                    'lat' => $lat,
                    'lon' => $lon,
                ]);
            }
        }

        // Columbarios
        foreach (self::COLUMBARIOS as [$lat, $lon]) {
            $row = DB::table('cemn_sepulturas')
                ->where('tipo', 'columbario')
                ->whereNull('lat')
                ->first();
            if ($row) {
                DB::table('cemn_sepulturas')->where('id', $row->id)->update([
                    'lat' => $lat,
                    'lon' => $lon,
                ]);
            }
        }

        // Actualizar también las coordenadas del cementerio (tabla cemn_cementerios)
        DB::table('cemn_cementerios')->limit(1)->update([
            'lat' => self::CEM_LAT,
            'lon' => self::CEM_LON,
        ]);
    }

    public function down(): void
    {
        // Quitar las coordenadas asignadas por esta migración
        DB::table('cemn_sepulturas')
            ->whereBetween('lat', [43.25400, 43.25500])
            ->whereBetween('lon', [-4.05000, -4.04800])
            ->update(['lat' => null, 'lon' => null]);
    }
};
