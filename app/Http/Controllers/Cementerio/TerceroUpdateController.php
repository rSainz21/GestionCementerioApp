<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnTercero;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TerceroUpdateController extends Controller
{
    public function update(Request $request, int $id): JsonResponse
    {
        /** @var CemnTercero $tercero */
        $tercero = CemnTercero::query()->findOrFail($id);

        $data = $request->validate([
            'nombre_original' => ['nullable', 'string', 'max:255'],
            'dni' => ['nullable', 'string', 'max:32'],
            'telefono' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'string', 'max:255'],
            'direccion' => ['nullable', 'string', 'max:255'],
            'notas' => ['nullable', 'string'],
        ]);

        $tercero->fill($data);
        $tercero->save();

        return response()->json([
            'message' => 'Tercero actualizado correctamente.',
            'item' => $tercero->fresh(),
        ]);
    }
}

