<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnConcesion;
use App\Models\CemnTercero;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConcesionTercerosController extends Controller
{
    /**
     * Vincula un tercero a una concesión (pivot `cemn_concesion_terceros`).
     *
     * Usado por la app móvil/web al crear concesión para guardar el concesionario.
     */
    public function store(Request $request, int $id): JsonResponse
    {
        $concesion = CemnConcesion::query()->findOrFail($id);

        $data = $request->validate([
            'tercero_id' => ['required', 'integer', 'min:1', 'exists:cemn_terceros,id'],
            'rol' => ['nullable', 'in:concesionario,heredero,solicitante'],
            'activo' => ['nullable', 'boolean'],
            'fecha_desde' => ['nullable', 'date'],
            'fecha_hasta' => ['nullable', 'date'],
            'notas' => ['nullable', 'string'],
        ]);

        $tercero = CemnTercero::query()->findOrFail((int) $data['tercero_id']);

        $concesion->terceros()->syncWithoutDetaching([
            $tercero->id => [
                'rol' => $data['rol'] ?? 'concesionario',
                'activo' => array_key_exists('activo', $data) ? (bool) $data['activo'] : true,
                'fecha_desde' => $data['fecha_desde'] ?? null,
                'fecha_hasta' => $data['fecha_hasta'] ?? null,
                'notas' => $data['notas'] ?? null,
            ],
        ]);

        return response()->json(['ok' => true]);
    }
}

