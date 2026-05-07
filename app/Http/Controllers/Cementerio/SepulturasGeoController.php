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
            ->get(['id', 'numero', 'lat', 'lon', 'estado', 'bloque_id', 'tipo'])
            ->map(function (CemnSepultura $s) {
                return [
                    'id' => $s->id,
                    'numero' => $s->numero,
                    'lat' => $s->lat,
                    'lon' => $s->lon,
                    'estado' => $s->estado,
                    'bloque_id' => $s->bloque_id,
                    'tipo' => $s->tipo,
                ];
            })
            ->values();

        return response()->json(['items' => $items]);
    }
}

