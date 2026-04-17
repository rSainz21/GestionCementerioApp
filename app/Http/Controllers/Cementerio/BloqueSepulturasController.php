<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnSepultura;

class BloqueSepulturasController extends Controller
{
    /**
     * Devuelve las sepulturas (nichos/columbarios) de un bloque, con difunto titular para tooltip.
     * Ruta esperada por el componente Vue:
     * GET /api/cementerio/bloques/{bloque}/sepulturas
     */
    public function index(int $bloqueId)
    {
        $sepulturas = CemnSepultura::query()
            ->where('bloque_id', $bloqueId)
            ->select([
                'id',
                'bloque_id',
                'zona_id',
                'tipo',
                'fila',
                'columna',
                'codigo',
                'estado',
            ])
            ->with([
                'difuntoTitular:id,sepultura_id,nombre_completo,fecha_inhumacion,es_titular',
            ])
            ->get();

        return response()->json([
            'data' => $sepulturas,
        ]);
    }
}

