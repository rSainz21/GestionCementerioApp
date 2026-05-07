<?php

namespace App\Http\Controllers\Cementerio\Admin;

use App\Http\Controllers\Controller;
use App\Models\CemnConcesion;
use Illuminate\Http\JsonResponse;

class ConcesionesAdminController extends Controller
{
    public function index(): JsonResponse
    {
        $items = CemnConcesion::query()
            ->with([
                'sepultura:id,codigo,zona_id,bloque_id',
                'sepultura.zona:id,nombre',
                'sepultura.bloque:id,nombre',
                'terceros:id,nombre,apellido1,apellido2,dni,nombre_original',
                'difuntos:id,concesion_id,nombre_completo,fecha_fallecimiento,fecha_inhumacion,es_titular,parentesco',
            ])
            ->orderByDesc('id')
            ->limit(500)
            ->get()
            ->map(fn (CemnConcesion $c) => TerceroConcesionesController::formatConcesion($c))
            ->values();

        return response()->json(['items' => $items]);
    }
}
