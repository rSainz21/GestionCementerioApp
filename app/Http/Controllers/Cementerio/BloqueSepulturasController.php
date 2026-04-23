<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnSepultura;

class BloqueSepulturasController extends Controller
{
    public function index(int $bloqueId)
    {
        $sepulturas = CemnSepultura::query()
            ->where('bloque_id', $bloqueId)
            ->select(['id', 'bloque_id', 'zona_id', 'tipo', 'numero', 'fila', 'columna', 'codigo', 'estado'])
            ->with([
                // Difunto titular enlazado directamente a la sepultura (inhumaciones directas)
                'difuntoTitular:id,sepultura_id,nombre_completo,fecha_inhumacion,es_titular,foto_path',
                // Concesión activa con sus terceros y difuntos (datos históricos)
                'concesionVigente:id,sepultura_id,numero_expediente,tipo,estado,fecha_concesion,fecha_vencimiento,notas',
                'concesionVigente.terceros:id,nombre,apellido1,apellido2,dni,nombre_original',
                'concesionVigente.difuntos:id,concesion_id,nombre_completo,fecha_inhumacion,es_titular',
            ])
            ->get()
            ->map(function (CemnSepultura $s) {
                $difunto    = $s->difuntoTitular;
                $concesion  = $s->concesionVigente;

                // Nombre para el tooltip: primero difunto directo, luego difunto vía concesión, luego concesionario
                $tooltipNombre = null;
                if ($difunto) {
                    $tooltipNombre = $difunto->nombre_completo;
                } elseif ($concesion?->difuntos?->isNotEmpty()) {
                    $tooltipNombre = $concesion->difuntos->first()->nombre_completo;
                } elseif ($concesion?->terceros?->isNotEmpty()) {
                    $concesionario = $concesion->terceros->firstWhere('pivot.rol', 'concesionario')
                        ?? $concesion->terceros->first();
                    $tooltipNombre = $concesionario->nombre_original
                        ?? trim(($concesionario->nombre ?? '') . ' ' . ($concesionario->apellido1 ?? '') . ' ' . ($concesionario->apellido2 ?? ''));
                }

                return [
                    'id'             => $s->id,
                    'bloque_id'      => $s->bloque_id,
                    'zona_id'        => $s->zona_id,
                    'tipo'           => $s->tipo,
                    'numero'         => $s->numero,
                    'fila'           => $s->fila,
                    'columna'        => $s->columna,
                    'codigo'         => $s->codigo,
                    'estado'         => $s->estado,
                    'difunto_titular' => $difunto ? [
                        'id'             => $difunto->id,
                        'nombre_completo'=> $difunto->nombre_completo,
                        'fecha_inhumacion' => optional($difunto->fecha_inhumacion)->toDateString(),
                        'foto_path'      => $difunto->foto_path,
                    ] : null,
                    'concesion' => $concesion ? [
                        'id'                => $concesion->id,
                        'numero_expediente' => $concesion->numero_expediente,
                        'tipo'              => $concesion->tipo,
                        'estado'            => $concesion->estado,
                        'concesionario'     => $tooltipNombre,
                        'difuntos'          => $concesion->difuntos?->map(fn ($d) => [
                            'id'              => $d->id,
                            'nombre_completo' => $d->nombre_completo,
                        ])->values(),
                    ] : null,
                    'tooltip_nombre' => $tooltipNombre,
                ];
            });

        return response()->json([
            'items' => $sepulturas,
            'data'  => $sepulturas,
        ]);
    }
}
