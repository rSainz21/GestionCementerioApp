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
                'difuntoTitular:id,sepultura_id,nombre_completo,fecha_fallecimiento,fecha_inhumacion,es_titular',
                'difuntos:id,sepultura_id,nombre_completo,fecha_fallecimiento,fecha_inhumacion,es_titular',
                'concesionVigente:id,sepultura_id,numero_expediente,tipo,fecha_concesion,fecha_vencimiento,duracion_anos,estado,importe,moneda,concesion_previa_id,notas',
                'concesionVigente.terceros:id,dni,nombre,apellido1,apellido2,email,telefono',
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
                'zona' => $sepultura->zona,
                'bloque' => $sepultura->bloque,
                'difunto_titular' => $sepultura->difuntoTitular,
                'difuntos' => $sepultura->difuntos,
                'concesion_vigente' => $sepultura->concesionVigente,
            ],
        ]);
    }
}

