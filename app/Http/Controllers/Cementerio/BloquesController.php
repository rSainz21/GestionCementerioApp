<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnBloque;
use Illuminate\Http\JsonResponse;

class BloquesController extends Controller
{
    public function index(): JsonResponse
    {
        $items = CemnBloque::query()
            ->with(['zona:id,nombre'])
            ->orderBy('id')
            ->get([
                'id',
                'zona_id',
                'codigo',
                'nombre',
                'tipo',
                'filas',
                'columnas',
            ])
            ->map(function (CemnBloque $b) {
                return [
                    'id' => $b->id,
                    'zona_id' => $b->zona_id,
                    'zona_nombre' => $b->zona?->nombre,
                    'codigo' => $b->codigo,
                    'nombre' => $b->nombre,
                    'tipo' => $b->tipo,
                    'filas' => $b->filas,
                    'columnas' => $b->columnas,
                ];
            })
            ->values();

        return response()->json(['items' => $items]);
    }
}

