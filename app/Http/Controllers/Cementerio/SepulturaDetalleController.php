<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
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
                'difuntoTitular:id,sepultura_id,nombre_completo,fecha_fallecimiento,fecha_inhumacion,es_titular,foto_path',
                'difuntos:id,sepultura_id,nombre_completo,fecha_fallecimiento,fecha_inhumacion,es_titular,foto_path',
                'difuntoTitular.movimientos:id,difunto_id,tipo,fecha,sepultura_origen_id,sepultura_destino_id,numero_expediente,notas',
                'difuntoTitular.movimientos.sepulturaOrigen:id,codigo',
                'difuntoTitular.movimientos.sepulturaDestino:id,codigo',
                'concesionVigente:id,sepultura_id,numero_expediente,tipo,fecha_concesion,fecha_vencimiento,duracion_anos,estado,importe,moneda,concesion_previa_id,notas',
                'concesionVigente.terceros:id,dni,nombre,apellido1,apellido2,email,telefono',
                'documentos:id,sepultura_id,tipo,nombre_original,ruta_archivo,mime_type,tamano_bytes,descripcion,created_at',
            ])
            ->findOrFail($id);

        // Normalizamos el payload para que el frontend tenga una forma estable.
        return response()->json([
            'item' => [
                'id' => $sepultura->id,
                'codigo' => $sepultura->codigo,
                'tipo' => $sepultura->tipo,
                'estado' => $sepultura->estado,
                'fila' => $sepultura->fila,
                'columna' => $sepultura->columna,
                'notas' => $sepultura->notas,
                'ubicacion_texto' => $sepultura->ubicacion_texto,
                'lat' => $sepultura->lat,
                'lon' => $sepultura->lon,
                'imagen' => $sepultura->imagen,
                'zona' => $sepultura->zona,
                'bloque' => $sepultura->bloque,
                'difunto_titular' => $sepultura->difuntoTitular,
                'difuntos' => $sepultura->difuntos,
                'concesion_vigente' => $sepultura->concesionVigente,
                'movimientos' => $sepultura->difuntoTitular?->movimientos
                    ? $sepultura->difuntoTitular->movimientos
                        ->sortByDesc('fecha')
                        ->values()
                        ->map(function ($m) {
                            return [
                                'id' => $m->id,
                                'tipo' => $m->tipo,
                                'fecha' => optional($m->fecha)->toDateString(),
                                'numero_expediente' => $m->numero_expediente,
                                'notas' => $m->notas,
                                'sepultura_origen_codigo' => $m->sepulturaOrigen?->codigo,
                                'sepultura_destino_codigo' => $m->sepulturaDestino?->codigo,
                            ];
                        })
                    : [],
                'documentos' => $sepultura->documentos
                    ->sortByDesc('created_at')
                    ->values()
                    ->map(function ($d) {
                        return [
                            'id' => $d->id,
                            'tipo' => $d->tipo,
                            'nombre_original' => $d->nombre_original,
                            'descripcion' => $d->descripcion,
                            'mime_type' => $d->mime_type,
                            'tamano_bytes' => $d->tamano_bytes,
                            'created_at' => optional($d->created_at)->toDateTimeString(),
                            'url' => $d->ruta_archivo ? ('/storage/' . ltrim($d->ruta_archivo, '/')) : null,
                        ];
                    }),
            ],
        ]);
    }
}

