<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnSepultura;
use App\Models\CemnZona;
use Illuminate\Http\JsonResponse;

class CementerioStatsZonaController extends Controller
{
    public function index(): JsonResponse
    {
        $zonas = CemnZona::orderBy('nombre')->get(['id', 'nombre']);

        $items = $zonas->map(function (CemnZona $z) {
            $base     = CemnSepultura::where('zona_id', $z->id);
            $libres   = (clone $base)->where('estado', CemnSepultura::ESTADO_LIBRE)->count();
            $ocupadas = (clone $base)->where('estado', CemnSepultura::ESTADO_OCUPADA)->count();
            $total    = $libres + $ocupadas;

            return [
                'id'           => $z->id,
                'nombre'       => $z->nombre,
                'libres'       => $libres,
                'ocupadas'     => $ocupadas,
                'total'        => $total,
                'pct_ocupadas' => $total > 0 ? round($ocupadas / $total * 100, 1) : 0,
            ];
        });

        return response()->json(['items' => $items->values()]);
    }
}
