<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnBloque;
use App\Models\CemnSepultura;
use Illuminate\Http\JsonResponse;

class CementerioStatsBloqueController extends Controller
{
    public function index(): JsonResponse
    {
        $bloques = CemnBloque::with('zona')->orderBy('nombre')->get(['id', 'nombre', 'codigo', 'zona_id']);

        $items = $bloques->map(function (CemnBloque $b) {
            $base     = CemnSepultura::where('bloque_id', $b->id);
            $libres   = (clone $base)->where('estado', CemnSepultura::ESTADO_LIBRE)->count();
            $ocupadas = (clone $base)->where('estado', CemnSepultura::ESTADO_OCUPADA)->count();
            $total    = $libres + $ocupadas;

            return [
                'id'          => $b->id,
                'nombre'      => $b->nombre,
                'codigo'      => $b->codigo,
                'zona'        => $b->zona?->nombre ?? '—',
                'libres'      => $libres,
                'ocupadas'    => $ocupadas,
                'total'       => $total,
                'pct_ocupadas' => $total > 0 ? round($ocupadas / $total * 100, 1) : 0,
            ];
        });

        return response()->json(['items' => $items->values()]);
    }
}
