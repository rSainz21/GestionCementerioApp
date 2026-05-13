<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnBloque;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BloquesGeoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $cid = $request->integer('cementerio_id') ?: null;
        $items = CemnBloque::query()
            ->with('zona:id,nombre,cementerio_id')
            ->when($cid, fn ($q) => $q->whereHas('zona', fn ($zq) => $zq->where('cementerio_id', $cid)))
            ->whereNotNull('lat')
            ->whereNotNull('lon')
            ->orderBy('nombre')
            ->get(['id', 'zona_id', 'nombre', 'codigo', 'tipo', 'filas', 'columnas', 'lat', 'lon'])
            ->map(fn ($b) => [
                'id'          => $b->id,
                'zona_id'     => $b->zona_id,
                'nombre'      => $b->nombre,
                'codigo'      => $b->codigo,
                'zona_nombre' => $b->zona?->nombre,
                'tipo_bloque' => $b->tipo,
                'filas'       => (int) $b->filas,
                'columnas'    => (int) $b->columnas,
                'lat'         => (float) $b->lat,
                'lon'         => (float) $b->lon,
                'tipo'        => 'bloque',
            ])
            ->values();

        return response()->json(['items' => $items]);
    }
}
