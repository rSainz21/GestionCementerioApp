<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnPersona;
use App\Models\CemnMovimiento;
use App\Models\CemnSepultura;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class WorkflowInhumacionController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'sepultura_id' => ['required', 'integer', 'exists:cemn_sepulturas,id'],
            'nombre_completo' => ['required', 'string', 'max:200'],
            'fecha_fallecimiento' => ['nullable', 'date'],
            'fecha_inhumacion' => ['nullable', 'date'],
            'es_principal' => ['nullable', 'boolean'],
            'parentesco' => ['nullable', 'string', 'max:60'],
            'notas' => ['nullable', 'string'],
            'confirmacion_documentacion_exhumacion' => ['nullable', 'boolean'],
        ]);

        $hayInhumadoActivo = CemnPersona::query()
            ->where('sepultura_id', $data['sepultura_id'])
            ->whereIn('tipo', ['difunto', 'ambos'])
            ->where('estado_inhumacion', 'inhumado')
            ->exists();

        if ($hayInhumadoActivo && ! $request->boolean('confirmacion_documentacion_exhumacion')) {
            throw ValidationException::withMessages([
                'confirmacion_documentacion_exhumacion' => [
                    'Debe confirmar que dispone de la documentación de exhumación completa antes de inhumar a otra persona en un nicho ya ocupado.',
                ],
            ]);
        }

        $res = DB::transaction(function () use ($data) {
            /** @var CemnSepultura $sepultura */
            $sepultura = CemnSepultura::query()
                ->lockForUpdate()
                ->findOrFail($data['sepultura_id']);

            if ($sepultura->estado === CemnSepultura::ESTADO_CLAUSURADA) {
                abort(422, 'No se puede inhumar en una sepultura clausurada.');
            }

            // Si ya hay inhumados activos en este nicho, pasan a ser "restos"
            CemnPersona::query()
                ->where('sepultura_id', $sepultura->id)
                ->where('estado_inhumacion', 'inhumado')
                ->update(['estado_inhumacion' => 'restos']);

            $difunto = CemnPersona::query()->create([
                'tipo'                => 'difunto',
                'nombre_completo'     => $data['nombre_completo'],
                'fecha_fallecimiento' => $data['fecha_fallecimiento'] ?? null,
                'fecha_inhumacion'    => $data['fecha_inhumacion'] ?? null,
                'sepultura_id'        => $sepultura->id,
                'estado_inhumacion'   => 'inhumado',
                'es_principal'        => true,
                'parentesco'          => $data['parentesco'] ?? null,
                'notas'               => $data['notas'] ?? null,
            ]);

            $mov = CemnMovimiento::query()->create([
                'persona_id' => $difunto->id,
                'tipo' => 'inhumacion',
                'fecha' => $data['fecha_inhumacion'] ?? null,
                'sepultura_origen_id' => $sepultura->id,
                'sepultura_destino_id' => null,
                'notas' => null,
            ]);

            if ($sepultura->estado !== CemnSepultura::ESTADO_OCUPADA) {
                $sepultura->estado = CemnSepultura::ESTADO_OCUPADA;
                $sepultura->save();
            }

            return [$difunto, $mov];
        });

        return response()->json([
            'ok' => true,
            'difunto_id' => $res[0]->id,
            'movimiento_id' => $res[1]->id,
        ]);
    }
}

