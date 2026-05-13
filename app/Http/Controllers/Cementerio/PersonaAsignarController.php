<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnPersona;
use App\Models\CemnSepultura;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PersonaAsignarController extends Controller
{
    public function update(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'sepultura_id' => ['required', 'integer', 'exists:cemn_sepulturas,id'],
            'confirmacion_documentacion_exhumacion' => ['nullable', 'boolean'],
        ]);

        $persona = CemnPersona::query()->findOrFail($id);

        $hayInhumadoActivoOtro = CemnPersona::query()
            ->where('sepultura_id', $data['sepultura_id'])
            ->whereIn('tipo', ['difunto', 'ambos'])
            ->where('estado_inhumacion', 'inhumado')
            ->where('id', '!=', $persona->id)
            ->exists();

        if ($hayInhumadoActivoOtro && ! $request->boolean('confirmacion_documentacion_exhumacion')) {
            throw ValidationException::withMessages([
                'confirmacion_documentacion_exhumacion' => [
                    'Debe confirmar que dispone de la documentación de exhumación completa antes de inhumar a otra persona en un nicho ya ocupado.',
                ],
            ]);
        }

        DB::transaction(function () use ($persona, $data) {
            $sepultura = CemnSepultura::query()
                ->lockForUpdate()
                ->findOrFail($data['sepultura_id']);

            if ($sepultura->estado === CemnSepultura::ESTADO_CLAUSURADA) {
                abort(422, 'No se puede asignar a una sepultura clausurada.');
            }

            // Si ya hay inhumados activos, pasan a ser "restos"
            CemnPersona::query()
                ->where('sepultura_id', $sepultura->id)
                ->whereIn('tipo', ['difunto', 'ambos'])
                ->where('estado_inhumacion', 'inhumado')
                ->update(['estado_inhumacion' => 'restos']);

            $persona->sepultura_id      = $sepultura->id;
            $persona->estado_inhumacion = 'inhumado';
            $persona->es_principal      = true;
            $persona->save();

            $sepultura->estado = CemnSepultura::ESTADO_OCUPADA;
            $sepultura->save();
        });

        return response()->json([
            'message' => 'Persona asignada a la sepultura correctamente.',
            'item'    => $persona->fresh(),
        ]);
    }
}
