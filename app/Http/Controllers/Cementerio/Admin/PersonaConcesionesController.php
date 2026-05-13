<?php

namespace App\Http\Controllers\Cementerio\Admin;

use App\Http\Controllers\Controller;
use App\Models\CemnPersona;
use Illuminate\Http\JsonResponse;

class PersonaConcesionesController extends Controller
{
    public function index(int $id): JsonResponse
    {
        $persona = CemnPersona::findOrFail($id);

        $concesiones = $persona->concesiones()
            ->with([
                'sepultura:id,codigo,zona_id,bloque_id',
                'sepultura.zona:id,nombre',
                'sepultura.bloque:id,nombre',
                'personas:id,nombre,apellido1,apellido2,nombre_completo,nombre_original,dni,tipo',
                'difuntos:id,concesion_id,nombre_completo,nombre,apellido1,apellido2,fecha_fallecimiento,fecha_inhumacion,es_principal,parentesco',
            ])
            ->orderByDesc('fecha_concesion')
            ->get()
            ->map(fn ($c) => self::formatConcesion($c));

        return response()->json([
            'persona' => [
                'id'             => $persona->id,
                'tipo'           => $persona->tipo,
                'nombre_display' => $persona->nombre_display,
                'nombre_original'=> $persona->nombre_original,
                'dni'            => $persona->dni,
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
            'personas'          => $c->personas->map(fn ($p) => [
                'id'             => $p->id,
                'tipo'           => $p->tipo,
                'nombre_display' => $p->nombre_display,
                'nombre_original'=> $p->nombre_original,
                'dni'            => $p->dni,
                'rol'            => $p->pivot->rol ?? 'concesionario',
            ])->values(),
            'difuntos'          => $c->difuntos->map(fn ($d) => [
                'id'                  => $d->id,
                'nombre_display'      => $d->nombre_display,
                'nombre_completo'     => $d->nombre_completo,
                'fecha_fallecimiento' => optional($d->fecha_fallecimiento)->toDateString(),
                'fecha_inhumacion'    => optional($d->fecha_inhumacion)->toDateString(),
                'es_principal'        => (bool) $d->es_principal,
                'parentesco'          => $d->parentesco,
            ])->values(),
        ];
    }
}
