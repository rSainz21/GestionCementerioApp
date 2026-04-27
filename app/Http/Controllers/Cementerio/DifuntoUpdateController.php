<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnDifunto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DifuntoUpdateController extends Controller
{
    public function update(Request $request, int $id): JsonResponse
    {
        /** @var CemnDifunto $difunto */
        $difunto = CemnDifunto::query()->findOrFail($id);

        $data = $request->validate([
            'nombre_completo'     => ['nullable', 'string', 'max:200'],
            'fecha_fallecimiento' => ['nullable', 'date'],
            'fecha_inhumacion'    => ['nullable', 'date'],
            'parentesco'          => ['nullable', 'string', 'max:60'],
            'notas'               => ['nullable', 'string'],
            'es_titular'          => ['nullable', 'boolean'],
        ]);

        $difunto->fill($data);
        $difunto->save();

        return response()->json([
            'message' => 'Difunto actualizado correctamente.',
            'item'    => $difunto->fresh(),
        ]);
    }
}
