<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnZona;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ZonasGeoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $cid = $request->integer('cementerio_id') ?: null;
        $items = CemnZona::query()
            ->when($cid, fn ($q) => $q->where('cementerio_id', $cid))
            ->whereNotNull('lat')
            ->whereNotNull('lon')
            ->orderBy('nombre')
            ->get(['id', 'cementerio_id', 'nombre', 'codigo', 'lat', 'lon', 'polygon'])
            ->map(fn ($z) => [
                'id'            => $z->id,
                'cementerio_id' => $z->cementerio_id,
                'nombre'        => $z->nombre,
                'codigo'        => $z->codigo,
                'lat'           => (float) $z->lat,
                'lon'           => (float) $z->lon,
                'polygon'       => $z->polygon,
                'tipo'          => 'zona',
            ])
            ->values();

        return response()->json(['items' => $items]);
    }
}
