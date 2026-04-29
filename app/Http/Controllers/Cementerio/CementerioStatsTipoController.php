<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnSepultura;
use Illuminate\Http\JsonResponse;

class CementerioStatsTipoController extends Controller
{
    public function index(): JsonResponse
    {
        $tipos = CemnSepultura::select('tipo')
            ->distinct()
            ->whereNotNull('tipo')
            ->orderBy('tipo')
            ->pluck('tipo');

        $items = $tipos->map(function (string $tipo) {
            $base     = CemnSepultura::where('tipo', $tipo);
            $libres   = (clone $base)->where('estado', CemnSepultura::ESTADO_LIBRE)->count();
            $ocupadas = (clone $base)->where('estado', CemnSepultura::ESTADO_OCUPADA)->count();
            $total    = $libres + $ocupadas;

            return [
                'tipo'         => $tipo,
                'nombre'       => ucfirst($tipo),
                'libres'       => $libres,
                'ocupadas'     => $ocupadas,
                'total'        => $total,
                'pct_ocupadas' => $total > 0 ? round($ocupadas / $total * 100, 1) : 0,
            ];
        });

        return response()->json(['items' => $items->values()]);
    }
}
