<?php

namespace App\Http\Controllers\Cementerio\Admin;

use App\Http\Controllers\Controller;
use App\Models\CemnTercero;
use Illuminate\Http\JsonResponse;

class TerceroConcesionesController extends Controller
{
    public function index(int $id): JsonResponse
    {
        $tercero = CemnTercero::findOrFail($id);

        $concesiones = $tercero->concesiones()
            ->with([
                'sepultura:id,codigo,zona_id,bloque_id',
                'sepultura.zona:id,nombre',
                'sepultura.bloque:id,nombre',
                'terceros:id,nombre,apellido1,apellido2,dni,nombre_original',
                'difuntos:id,concesion_id,nombre_completo,fecha_fallecimiento,fecha_inhumacion,es_titular,parentesco',
            ])
            ->orderByDesc('fecha_concesion')
            ->get()
            ->map(fn ($c) => self::formatConcesion($c));

        return response()->json([
            'tercero' => [
                'id'             => $tercero->id,
                'nombre_original'=> $tercero->nombre_original,
                'dni'            => $tercero->dni,
            ],
            'items' => $concesiones,
        ]);
    }

    public static function formatConcesion($c): array
    {
        return [
            'id'                => $c->id,
            'numero_expediente' => $c->numero_expediente,
            'tipo'              => $c->tipo,
            'estado'            => $c->estado,
            'fecha_concesion'   => optional($c->fecha_concesion)->toDateString(),
            'fecha_vencimiento' => optional($c->fecha_vencimiento)->toDateString(),
            'duracion_anos'     => $c->duracion_anos,
            'importe'           => $c->importe,
            'moneda'            => $c->moneda,
            'texto_concesion'   => $c->texto_concesion,
            'notas'             => $c->notas,
            'sepultura_codigo'  => $c->sepultura?->codigo,
            'zona_nombre'       => $c->sepultura?->zona?->nombre,
            'bloque_nombre'     => $c->sepultura?->bloque?->nombre,
            'terceros'          => $c->terceros->map(fn ($t) => [
                'id'             => $t->id,
                'nombre_original'=> $t->nombre_original,
                'dni'            => $t->dni,
                'rol'            => $t->pivot->rol ?? 'concesionario',
            ])->values(),
            'difuntos'          => $c->difuntos->map(fn ($d) => [
                'id'                  => $d->id,
                'nombre_completo'     => $d->nombre_completo,
                'fecha_fallecimiento' => optional($d->fecha_fallecimiento)->toDateString(),
                'fecha_inhumacion'    => optional($d->fecha_inhumacion)->toDateString(),
                'es_titular'          => (bool) $d->es_titular,
                'parentesco'          => $d->parentesco,
            ])->values(),
        ];
    }
}
