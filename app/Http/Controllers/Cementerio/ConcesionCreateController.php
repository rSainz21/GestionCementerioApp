<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnConcesion;
use App\Models\CemnConcesionPersona;
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
            'persona_id'        => ['nullable', 'integer', 'exists:cemn_personas,id'],
        ]);

        $personaId = $data['persona_id'] ?? null;
        unset($data['persona_id']);

        $data['tipo']        = $data['tipo']   ?? 'perpetua';
        $data['estado']      = $data['estado'] ?? 'vigente';
        $data['sepultura_id'] = null;

        $concesion = CemnConcesion::create($data);

        if ($personaId) {
            CemnConcesionPersona::create([
                'concesion_id' => $concesion->id,
                'persona_id'   => $personaId,
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
