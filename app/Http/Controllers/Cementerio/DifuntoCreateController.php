<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnDifunto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DifuntoCreateController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nombre_completo'     => ['required', 'string', 'max:200'],
            'fecha_fallecimiento' => ['nullable', 'date'],
            'fecha_inhumacion'    => ['nullable', 'date'],
            'es_titular'          => ['nullable', 'boolean'],
            'parentesco'          => ['nullable', 'string', 'max:60'],
            'notas'               => ['nullable', 'string'],
        ]);

        $data['es_titular'] = $data['es_titular'] ?? true;
        $data['sepultura_id'] = null;

        $difunto = CemnDifunto::create($data);

        return response()->json([
            'message' => 'Difunto creado correctamente.',
            'item'    => $difunto->fresh(),
        ], 201);
    }
}
