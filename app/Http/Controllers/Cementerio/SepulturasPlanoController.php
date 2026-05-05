<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnSepultura;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Devuelve unidades para la "planta" (XY discreto por fila/columna en bloque).
 * Diseñado para UI tipo "rectángulos" (muy rápido) en móvil/web.
 */
class SepulturasPlanoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $limit = (int) $request->query('limit', 6000);
        if ($limit <= 0) $limit = 6000;
        if ($limit > 12000) $limit = 12000;

        $items = CemnSepultura::query()
            ->whereNotNull('bloque_id')
            ->whereNotNull('fila')
            ->whereNotNull('columna')
            ->with([
                'bloque:id,codigo',
                'zona:id,nombre',
                'difuntoTitular:id,sepultura_id,nombre_completo,fecha_inhumacion',
                'concesionVigente:id,sepultura_id,fecha_vencimiento,numero_expediente',
            ])
            ->limit($limit)
            ->get(['id', 'numero', 'estado', 'tipo', 'bloque_id', 'zona_id', 'fila', 'columna'])
            ->map(function (CemnSepultura $s) {
                return [
                    'id' => $s->id,
                    'numero' => $s->numero,
                    'estado' => $s->estado,
                    'tipo' => $s->tipo,
                    'bloque_id' => $s->bloque_id,
                    'bloque_codigo' => $s->bloque?->codigo,
                    'zona_id' => $s->zona_id,
                    'zona_nombre' => $s->zona?->nombre,
                    'fila' => $s->fila,
                    'columna' => $s->columna,
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

