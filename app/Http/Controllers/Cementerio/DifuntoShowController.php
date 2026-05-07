<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnDifunto;
use Illuminate\Http\JsonResponse;

class DifuntoShowController extends Controller
{
    public function show(int $id): JsonResponse
    {
        $difunto = CemnDifunto::query()
            ->with([
                'sepultura:id,codigo,zona_id,bloque_id',
                'sepultura.zona:id,nombre',
                'sepultura.bloque:id,nombre',
                'concesion:id,numero_expediente,tipo,estado,fecha_concesion,fecha_vencimiento,importe,moneda',
                'concesion.terceros:id,nombre,apellido1,apellido2,nombre_original,dni',
                'tercero:id,nombre,apellido1,apellido2,nombre_original,dni',
            ])
            ->findOrFail($id);

        return response()->json([
            'item' => [
                'id'                  => $difunto->id,
                'nombre_completo'     => $difunto->nombre_completo,
                'fecha_fallecimiento' => optional($difunto->fecha_fallecimiento)->toDateString(),
                'fecha_inhumacion'    => optional($difunto->fecha_inhumacion)->toDateString(),
                'es_titular'          => (bool) $difunto->es_titular,
                'parentesco'          => $difunto->parentesco,
                'notas'               => $difunto->notas,
                'foto_url'            => $difunto->foto_url,
                'sepultura'           => $difunto->sepultura ? [
                    'id'           => $difunto->sepultura->id,
                    'codigo'       => $difunto->sepultura->codigo,
                    'zona_nombre'  => $difunto->sepultura->zona?->nombre,
                    'bloque_nombre'=> $difunto->sepultura->bloque?->nombre,
                ] : null,
                'concesion' => $difunto->concesion ? [
                    'id'                => $difunto->concesion->id,
                    'numero_expediente' => $difunto->concesion->numero_expediente,
                    'tipo'              => $difunto->concesion->tipo,
                    'estado'            => $difunto->concesion->estado,
                    'fecha_concesion'   => optional($difunto->concesion->fecha_concesion)->toDateString(),
                    'fecha_vencimiento' => optional($difunto->concesion->fecha_vencimiento)->toDateString(),
                    'importe'           => $difunto->concesion->importe,
                    'moneda'            => $difunto->concesion->moneda,
                    'concesionarios'    => $difunto->concesion->terceros
                        ->map(fn ($t) => [
                            'id'             => $t->id,
                            'nombre_original'=> $t->nombre_original,
                            'dni'            => $t->dni,
                            'rol'            => $t->pivot->rol ?? 'concesionario',
                        ])->values(),
                ] : null,
                'tercero' => $difunto->tercero ? [
                    'id'             => $difunto->tercero->id,
                    'nombre_original'=> $difunto->tercero->nombre_original,
                    'dni'            => $difunto->tercero->dni,
                ] : null,
            ],
        ]);
    }
}
