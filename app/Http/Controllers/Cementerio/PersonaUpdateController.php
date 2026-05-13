<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnPersona;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PersonaUpdateController extends Controller
{
    public function update(Request $request, int $id): JsonResponse
    {
        $persona = CemnPersona::query()->findOrFail($id);

        $data = $request->validate([
            'tipo'                => ['nullable', Rule::in(['titular', 'difunto', 'ambos'])],
            'nombre_completo'     => ['nullable', 'string', 'max:200'],
            'nombre'              => ['nullable', 'string', 'max:60'],
            'apellido1'           => ['nullable', 'string', 'max:60'],
            'apellido2'           => ['nullable', 'string', 'max:60'],
            'nombre_original'     => ['nullable', 'string', 'max:200'],
            'dni'                 => ['nullable', 'string', 'max:20'],
            'es_empresa'          => ['nullable', 'boolean'],
            'cif'                 => ['nullable', 'string', 'max:20'],
            'razon_social'        => ['nullable', 'string', 'max:200'],
            'telefono'            => ['nullable', 'string', 'max:20'],
            'email'               => ['nullable', 'string', 'max:120'],
            'direccion'           => ['nullable', 'string', 'max:255'],
            'municipio'           => ['nullable', 'string', 'max:80'],
            'provincia'           => ['nullable', 'string', 'max:80'],
            'cp'                  => ['nullable', 'string', 'max:10'],
            'fecha_fallecimiento' => ['nullable', 'date'],
            'fecha_inhumacion'    => ['nullable', 'date'],
            'es_principal'        => ['nullable', 'boolean'],
            'parentesco'          => ['nullable', 'string', 'max:60'],
            'notas'               => ['nullable', 'string'],
        ]);

        $persona->fill($data);
        $persona->save();

        return response()->json([
            'message' => 'Persona actualizada correctamente.',
            'item'    => $persona->fresh(),
        ]);
    }
}
