<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnDifunto;
use App\Models\CemnMovimiento;
use App\Models\CemnSepultura;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class WorkflowExhumacionController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'sepultura_id' => ['required', 'integer', 'exists:cemn_sepulturas,id'],
            'difunto_id' => ['required', 'integer', 'exists:cemn_difuntos,id'],
            'tipo' => ['required', 'string', Rule::in(['exhumacion', 'traslado'])],
            'fecha' => ['nullable', 'date'],
            'notas' => ['nullable', 'string'],
            'sepultura_destino_id' => ['nullable', 'integer', 'exists:cemn_sepulturas,id'],
        ]);

        $out = DB::transaction(function () use ($data) {
            /** @var CemnSepultura $sepultura */
            $sepultura = CemnSepultura::query()
                ->lockForUpdate()
                ->findOrFail($data['sepultura_id']);

            /** @var CemnDifunto $difunto */
            $difunto = CemnDifunto::query()
                ->lockForUpdate()
                ->findOrFail($data['difunto_id']);

            if ((int) $difunto->sepultura_id !== (int) $sepultura->id) {
                abort(422, 'El difunto indicado no está vinculado a esta sepultura.');
            }

            $mov = CemnMovimiento::query()->create([
                'difunto_id' => $difunto->id,
                'tipo' => $data['tipo'],
                'fecha' => $data['fecha'] ?? null,
                'sepultura_origen_id' => $sepultura->id,
                'sepultura_destino_id' => $data['sepultura_destino_id'] ?? null,
                'notas' => $data['notas'] ?? null,
            ]);

            // Desvincula el difunto del nicho (restos exhumados/trasladados)
            $difunto->sepultura_id = null;
            $difunto->save();

            $restantes = CemnDifunto::query()
                ->where('sepultura_id', $sepultura->id)
                ->count();

            if ($restantes === 0) {
                $sepultura->estado = CemnSepultura::ESTADO_LIBRE;
                $sepultura->save();
            }

            return [$mov->id, $restantes];
        });

        return response()->json([
            'ok' => true,
            'movimiento_id' => $out[0],
            'restantes' => $out[1],
        ]);
    }
}

