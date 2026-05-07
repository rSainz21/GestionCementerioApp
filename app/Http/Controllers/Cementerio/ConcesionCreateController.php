<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnConcesion;
use App\Models\CemnConcesionTercero;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ConcesionCreateController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'numero_expediente' => ['nullable', 'string', 'max:30'],
            'tipo'              => ['nullable', Rule::in(['temporal', 'perpetua'])],
            'estado'            => ['nullable', Rule::in(['vigente', 'renovada', 'vencida', 'rescindida'])],
            'fecha_concesion'   => ['nullable', 'date'],
            'fecha_vencimiento' => ['nullable', 'date'],
            'importe'           => ['nullable', 'numeric', 'min:0'],
            'moneda'            => ['nullable', Rule::in(['euros', 'pesetas'])],
            'notas'             => ['nullable', 'string'],
            'tercero_id'        => ['nullable', 'integer', 'exists:cemn_terceros,id'],
        ]);

        $terceroId = $data['tercero_id'] ?? null;
        unset($data['tercero_id']);

        $data['tipo']        = $data['tipo']   ?? 'perpetua';
        $data['estado']      = $data['estado'] ?? 'vigente';
        $data['sepultura_id'] = null;

        $concesion = CemnConcesion::create($data);

        if ($terceroId) {
            CemnConcesionTercero::create([
                'concesion_id' => $concesion->id,
                'tercero_id'   => $terceroId,
                'rol'          => 'concesionario',
                'activo'       => true,
            ]);
        }

        return response()->json([
            'message' => 'Concesión creada correctamente.',
            'item'    => $concesion->fresh(),
        ], 201);
    }
}
