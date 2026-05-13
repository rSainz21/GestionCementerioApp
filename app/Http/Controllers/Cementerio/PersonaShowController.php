<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnPersona;
use Illuminate\Http\JsonResponse;

class PersonaShowController extends Controller
{
    public function show(int $id): JsonResponse
    {
        $persona = CemnPersona::query()
            ->with([
                'sepultura:id,codigo,zona_id,bloque_id',
                'sepultura.zona:id,nombre',
                'sepultura.bloque:id,nombre',
                'concesion:id,numero_expediente,tipo,estado,fecha_concesion,fecha_vencimiento,importe,moneda',
                'concesion.personas:id,nombre,apellido1,apellido2,nombre_original,nombre_completo,dni',
            ])
            ->findOrFail($id);

        return response()->json([
            'item' => [
                'id'                     => $persona->id,
                'tipo'                   => $persona->tipo,
                'nombre_display'         => $persona->nombre_display,
                'nombre_completo'        => $persona->nombre_completo,
                'nombre'                 => $persona->nombre,
                'apellido1'              => $persona->apellido1,
                'apellido2'              => $persona->apellido2,
                'nombre_original'        => $persona->nombre_original,
                'dni'                    => $persona->dni,
                'es_empresa'             => (bool) $persona->es_empresa,
                'cif'                    => $persona->cif,
                'razon_social'           => $persona->razon_social,
                'telefono'               => $persona->telefono,
                'email'                  => $persona->email,
                'direccion'              => $persona->direccion,
                'municipio'              => $persona->municipio,
                'provincia'              => $persona->provincia,
                'cp'                     => $persona->cp,
                'fecha_fallecimiento'    => optional($persona->fecha_fallecimiento)->toDateString(),
                'fecha_inhumacion'       => optional($persona->fecha_inhumacion)->toDateString(),
                'fecha_exhumacion'       => optional($persona->fecha_exhumacion)->toDateString(),
                'estado_inhumacion'      => $persona->estado_inhumacion,
                'es_principal'           => (bool) $persona->es_principal,
                'parentesco'             => $persona->parentesco,
                'foto_url'               => $persona->foto_url,
                'notas'                  => $persona->notas,
                'sepultura' => $persona->sepultura ? [
                    'id'            => $persona->sepultura->id,
                    'codigo'        => $persona->sepultura->codigo,
                    'zona_nombre'   => $persona->sepultura->zona?->nombre,
                    'bloque_nombre' => $persona->sepultura->bloque?->nombre,
                ] : null,
                'concesion' => $persona->concesion ? [
                    'id'                => $persona->concesion->id,
                    'numero_expediente' => $persona->concesion->numero_expediente,
                    'tipo'              => $persona->concesion->tipo,
                    'estado'            => $persona->concesion->estado,
                    'fecha_concesion'   => optional($persona->concesion->fecha_concesion)->toDateString(),
                    'fecha_vencimiento' => optional($persona->concesion->fecha_vencimiento)->toDateString(),
                    'importe'           => $persona->concesion->importe,
                    'moneda'            => $persona->concesion->moneda,
                    'concesionarios'    => $persona->concesion->personas
                        ->map(fn ($p) => [
                            'id'             => $p->id,
                            'nombre_display' => $p->nombre_display,
                            'nombre_original' => $p->nombre_original,
                            'dni'            => $p->dni,
                            'rol'            => $p->pivot->rol ?? 'concesionario',
                        ])->values(),
                ] : null,
            ],
        ]);
    }
}
