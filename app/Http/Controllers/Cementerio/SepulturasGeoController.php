<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnSepultura;
use App\Models\CemnSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SepulturasGeoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $maxGeo = CemnSetting::intRange('geo_sepulturas_limite_maximo', 5000, 1000, 20000);
        $defGeo = min(
            CemnSetting::intRange('geo_sepulturas_limite_default', 2000, 500, 10000),
            $maxGeo
        );
        $limit = (int) $request->query('limit', $defGeo);
        if ($limit <= 0) {
            $limit = $defGeo;
        }
        if ($limit > $maxGeo) {
            $limit = $maxGeo;
        }

        $cid = $request->integer('cementerio_id') ?: null;

        $items = CemnSepultura::query()
            ->when($cid, fn ($q) => $q->whereHas('zona', fn ($zq) => $zq->where('cementerio_id', $cid)))
            ->whereNotNull('lat')
            ->whereNotNull('lon')
            ->limit($limit)
            ->get(['id', 'zona_id', 'numero', 'lat', 'lon', 'estado', 'bloque_id', 'tipo'])
            ->map(fn (CemnSepultura $s) => [
                'id'        => $s->id,
                'zona_id'   => $s->zona_id,
                'numero'    => $s->numero,
                'lat'       => $s->lat,
                'lon'       => $s->lon,
                'estado'    => $s->estado,
                'bloque_id' => $s->bloque_id,
                'tipo'      => $s->tipo,
            ])
            ->values();

        return response()->json(['items' => $items]);
    }
}
