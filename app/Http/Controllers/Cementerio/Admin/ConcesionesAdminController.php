<?php

namespace App\Http\Controllers\Cementerio\Admin;

use App\Http\Controllers\Controller;
use App\Models\CemnConcesion;
use App\Models\CemnSetting;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Cementerio\Admin\PersonaConcesionesController;

class ConcesionesAdminController extends Controller
{
    public function index(): JsonResponse
    {
        $lim = CemnSetting::intRange('admin_listado_busqueda_limite', 500, 100, 2000);

        $items = CemnConcesion::query()
            ->with([
                'sepultura:id,codigo,zona_id,bloque_id',
                'sepultura.zona:id,nombre',
                'sepultura.bloque:id,nombre',
                'personas:id,tipo,nombre,apellido1,apellido2,nombre_completo,nombre_original,dni',
                'difuntos:id,tipo,concesion_id,nombre_completo,nombre,apellido1,apellido2,fecha_fallecimiento,fecha_inhumacion,es_principal,parentesco',
            ])
            ->orderByDesc('id')
            ->limit($lim)
            ->get()
            ->map(fn (CemnConcesion $c) => PersonaConcesionesController::formatConcesion($c))
            ->values();

        return response()->json(['items' => $items]);
    }
}
