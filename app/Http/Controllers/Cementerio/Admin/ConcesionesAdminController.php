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
                'sepultura:id,codigo,zona_id,bloque_id,fila,columna,estado',
                'sepultura.zona:id,nombre',
                'sepultura.bloque:id,nombre,codigo',
                'terceros:id,nombre,apellido1,apellido2,dni',
            ])
            ->orderByDesc('id')
            ->limit(500)
            ->get()
            ->map(function (CemnConcesion $c) {
                $concesionario = $c->terceros->firstWhere('pivot.rol', 'concesionario')
                    ?? $c->terceros->first();

                return [
                    'id' => $c->id,
                    'sepultura_id' => $c->sepultura_id,
                    'sepultura_codigo' => $c->sepultura?->codigo,
                    'zona_nombre' => $c->sepultura?->zona?->nombre,
                    'bloque_nombre' => $c->sepultura?->bloque?->nombre,
                    'numero_expediente' => $c->numero_expediente,
                    'tipo' => $c->tipo,
                    'fecha_concesion' => optional($c->fecha_concesion)->toDateString(),
                    'fecha_vencimiento' => optional($c->fecha_vencimiento)->toDateString(),
                    'duracion_anos' => $c->duracion_anos,
                    'estado' => $c->estado,
                    'concesionario' => $concesionario
                        ? trim(($concesionario->nombre ?? '').' '.($concesionario->apellido1 ?? '').' '.($concesionario->apellido2 ?? ''))
                        : null,
                    'concesionario_dni' => $concesionario?->dni,
                ];
            })
            ->values();

        return response()->json(['items' => $items]);
    }
}

