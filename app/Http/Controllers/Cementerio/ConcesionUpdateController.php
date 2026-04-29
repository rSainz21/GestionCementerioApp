<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnConcesion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ConcesionUpdateController extends Controller
{
    public function update(Request $request, int $id): JsonResponse
    {
        /** @var CemnConcesion $concesion */
        $concesion = CemnConcesion::query()->findOrFail($id);

        $data = $request->validate([
            'sepultura_id'      => ['nullable', 'integer', 'exists:cemn_sepulturas,id'],
            'numero_expediente' => ['nullable', 'string', 'max:30'],
            'tipo'              => ['nullable', Rule::in(['temporal', 'perpetua'])],
            'estado'            => ['nullable', Rule::in(['vigente', 'renovada', 'vencida', 'rescindida'])],
            'fecha_concesion'   => ['nullable', 'date'],
            'fecha_vencimiento' => ['nullable', 'date'],
            'duracion_anos'     => ['nullable', 'integer', 'min:1'],
            'importe'           => ['nullable', 'numeric', 'min:0'],
            'moneda'            => ['nullable', Rule::in(['euros', 'pesetas'])],
            'texto_concesion'   => ['nullable', 'string'],
            'notas'             => ['nullable', 'string'],
        ]);

        $concesion->fill($data);
        $concesion->save();

        return response()->json([
            'message' => 'Concesión actualizada correctamente.',
            'item'    => $concesion->fresh(),
        ]);
    }
}
