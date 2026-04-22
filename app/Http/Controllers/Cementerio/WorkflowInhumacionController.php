<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnDifunto;
use App\Models\CemnMovimiento;
use App\Models\CemnSepultura;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WorkflowInhumacionController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'sepultura_id' => ['required', 'integer', 'exists:cemn_sepulturas,id'],
            'nombre_completo' => ['required', 'string', 'max:200'],
            'fecha_fallecimiento' => ['nullable', 'date'],
            'fecha_inhumacion' => ['nullable', 'date'],
            'es_titular' => ['nullable', 'boolean'],
            'parentesco' => ['nullable', 'string', 'max:60'],
            'notas' => ['nullable', 'string'],
        ]);

        $res = DB::transaction(function () use ($data) {
            /** @var CemnSepultura $sepultura */
            $sepultura = CemnSepultura::query()
                ->lockForUpdate()
                ->findOrFail($data['sepultura_id']);

            $difunto = CemnDifunto::query()->create([
                'tercero_id' => null,
                'nombre_completo' => $data['nombre_completo'],
                'fecha_fallecimiento' => $data['fecha_fallecimiento'] ?? null,
                'fecha_inhumacion' => $data['fecha_inhumacion'] ?? null,
                'sepultura_id' => $sepultura->id,
                'es_titular' => (bool) ($data['es_titular'] ?? true),
                'parentesco' => $data['parentesco'] ?? null,
                'notas' => $data['notas'] ?? null,
            ]);

            $mov = CemnMovimiento::query()->create([
                'difunto_id' => $difunto->id,
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

