<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnSepultura;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SepulturaUpdateController extends Controller
{
    public function update(Request $request, int $id): JsonResponse
    {
        /** @var CemnSepultura $sepultura */
        $sepultura = CemnSepultura::query()->findOrFail($id);

        $data = $request->validate([
            'estado' => ['nullable', 'string', Rule::in([
                CemnSepultura::ESTADO_LIBRE,
                CemnSepultura::ESTADO_OCUPADA,
                CemnSepultura::ESTADO_RESERVADA,
                CemnSepultura::ESTADO_CLAUSURADA,
            ])],
            'notas' => ['nullable', 'string'],
            'ubicacion_texto' => ['nullable', 'string', 'max:255'],
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lon' => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        $sepultura->fill($data);
        $sepultura->save();

        return response()->json([
            'message' => 'Sepultura actualizada correctamente.',
            'item' => $sepultura->fresh(['bloque:id,codigo', 'zona:id,nombre']),
        ]);
    }
}

