<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnSepultura;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SepulturasGeoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $limit = (int) $request->query('limit', 2000);
        if ($limit <= 0) $limit = 2000;
        if ($limit > 5000) $limit = 5000;

        $items = CemnSepultura::query()
            ->whereNotNull('lat')
            ->whereNotNull('lon')
            ->limit($limit)
            ->with([
                'bloque:id,codigo',
                'zona:id,nombre',
                'difuntoTitular:id,sepultura_id,nombre_completo,fecha_inhumacion',
                'concesionVigente:id,sepultura_id,fecha_vencimiento,numero_expediente',
            ])
            ->get(['id', 'numero', 'lat', 'lon', 'estado', 'bloque_id', 'zona_id', 'tipo'])
            ->map(function (CemnSepultura $s) {
                return [
                    'id' => $s->id,
                    'numero' => $s->numero,
                    'lat' => $s->lat,
                    'lon' => $s->lon,
                    'estado' => $s->estado,
                    'bloque_id' => $s->bloque_id,
                    'bloque_codigo' => $s->bloque?->codigo,
                    'zona_id' => $s->zona_id,
                    'zona_nombre' => $s->zona?->nombre,
                    'tipo' => $s->tipo,
                    'titular' => $s->difuntoTitular?->nombre_completo,
                    'fecha_inhumacion' => $s->difuntoTitular?->fecha_inhumacion,
                    'expediente' => $s->concesionVigente?->numero_expediente,
                    'caducidad' => $s->concesionVigente?->fecha_vencimiento,
                ];
            })
            ->values();

        return response()->json(['items' => $items]);
    }
}

