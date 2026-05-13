<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnMovimiento;
use App\Models\CemnSepultura;
use Illuminate\Http\JsonResponse;

class SepulturaDetalleController extends Controller
{
    public function show(int $id): JsonResponse
    {
        $sepultura = CemnSepultura::query()
            ->with([
                'zona:id,nombre,codigo',
                'bloque:id,zona_id,nombre,codigo,tipo,filas,columnas',
                'difuntoTitular:id,tipo,sepultura_id,nombre_completo,nombre,apellido1,apellido2,fecha_fallecimiento,fecha_inhumacion,fecha_exhumacion,estado_inhumacion,es_principal,foto_path',
                'difuntos:id,tipo,sepultura_id,nombre_completo,nombre,apellido1,apellido2,fecha_fallecimiento,fecha_inhumacion,fecha_exhumacion,estado_inhumacion,es_principal,foto_path',
                'concesionVigente:id,sepultura_id,numero_expediente,tipo,fecha_concesion,fecha_vencimiento,duracion_anos,estado,importe,moneda,concesion_previa_id,texto_concesion,notas',
                'concesionVigente.personas:id,tipo,dni,nombre,apellido1,apellido2,nombre_completo,nombre_original',
                'concesionVigente.difuntos:id,tipo,concesion_id,nombre_completo,nombre,apellido1,apellido2,fecha_fallecimiento,fecha_inhumacion,es_principal,parentesco',
                'documentos:id,sepultura_id,tipo,nombre_original,ruta_archivo,mime_type,tamano_bytes,descripcion,created_at',
            ])
            ->findOrFail($id);

        // Historial de movimientos del nicho: todos los que tienen este nicho como origen o destino
        $movimientos = CemnMovimiento::query()
            ->where(function ($q) use ($id) {
                $q->where('sepultura_origen_id', $id)
                  ->orWhere('sepultura_destino_id', $id);
            })
            ->with([
                'persona:id,nombre_completo,nombre,apellido1,apellido2,estado_inhumacion',
                'sepulturaOrigen:id,codigo',
                'sepulturaDestino:id,codigo',
            ])
            ->orderByDesc('fecha')
            ->orderByDesc('id')
            ->get()
            ->map(fn ($m) => [
                'id'                       => $m->id,
                'tipo'                     => $m->tipo,
                'fecha'                    => optional($m->fecha)->toDateString(),
                'numero_expediente'        => $m->numero_expediente,
                'notas'                    => $m->notas,
                'difunto_nombre'           => $m->persona?->nombre_display ?? $m->persona?->nombre_completo,
                'difunto_estado'           => $m->persona?->estado_inhumacion,
                'sepultura_origen_codigo'  => $m->sepulturaOrigen?->codigo,
                'sepultura_destino_codigo' => $m->sepulturaDestino?->codigo,
            ])
            ->values();

        return response()->json([
            'item' => [
                'id'               => $sepultura->id,
                'codigo'           => $sepultura->codigo,
                'tipo'             => $sepultura->tipo,
                'estado'           => $sepultura->estado,
                'fila'             => $sepultura->fila,
                'columna'          => $sepultura->columna,
                'notas'            => $sepultura->notas,
                'ubicacion_texto'  => $sepultura->ubicacion_texto,
                'lat'              => $sepultura->lat,
                'lon'              => $sepultura->lon,
                'imagen'           => $sepultura->imagen,
                'imagen_url'       => $sepultura->imagen_url,
                'zona'             => $sepultura->zona,
                'bloque'           => $sepultura->bloque,
                'difunto_titular'  => $sepultura->difuntoTitular,
                'difuntos'         => $sepultura->difuntos,
                'concesion_vigente' => $sepultura->concesionVigente ? array_merge(
                    $sepultura->concesionVigente->toArray(),
                    [
                        'concesionario' => $sepultura->concesionVigente->personas
                            ? ($sepultura->concesionVigente->personas->firstWhere('pivot.rol', 'concesionario')
                                ?? $sepultura->concesionVigente->personas->first())
                            : null,
                        'difuntos_concesion' => $sepultura->concesionVigente->difuntos?->map(fn ($d) => [
                            'id'                  => $d->id,
                            'nombre_display'      => $d->nombre_display,
                            'nombre_completo'     => $d->nombre_completo,
                            'fecha_fallecimiento' => optional($d->fecha_fallecimiento)->toDateString(),
                            'fecha_inhumacion'    => optional($d->fecha_inhumacion)->toDateString(),
                            'fecha_exhumacion'    => optional($d->fecha_exhumacion)->toDateString(),
                            'estado_inhumacion'   => $d->estado_inhumacion ?? 'inhumado',
                            'es_principal'        => (bool) $d->es_principal,
                            'parentesco'          => $d->parentesco,
                        ])->values(),
                    ]
                ) : null,
                'movimientos' => $movimientos,
                'documentos'  => $sepultura->documentos
                    ->sortByDesc('created_at')
                    ->values()
                    ->map(fn ($d) => [
                        'id'             => $d->id,
                        'tipo'           => $d->tipo,
                        'nombre_original'=> $d->nombre_original,
                        'descripcion'    => $d->descripcion,
                        'mime_type'      => $d->mime_type,
                        'tamano_bytes'   => $d->tamano_bytes,
                        'created_at'     => optional($d->created_at)->toDateTimeString(),
                        'url'            => $d->ruta_archivo ? ('/storage/' . ltrim($d->ruta_archivo, '/')) : null,
                    ]),
            ],
        ]);
    }
}
