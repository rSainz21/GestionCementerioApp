<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnZona;
use Illuminate\Http\JsonResponse;

class ZonasGeoController extends Controller
{
    public function index(): JsonResponse
    {
        $items = CemnZona::query()
            ->whereNotNull('lat')
            ->whereNotNull('lon')
            ->orderBy('nombre')
            ->get(['id', 'nombre', 'codigo', 'lat', 'lon', 'polygon'])
            ->map(fn ($z) => [
                'id'     => $z->id,
                'nombre' => $z->nombre,
                'codigo' => $z->codigo,
                'lat'    => (float) $z->lat,
                'lon'    => (float) $z->lon,
                'polygon'=> $z->polygon,
                'tipo'   => 'zona',
            ])
            ->values();

        return response()->json(['items' => $items]);
    }
}
