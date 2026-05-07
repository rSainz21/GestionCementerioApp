<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnDifunto;
use App\Models\CemnSepultura;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DifuntoAsignarController extends Controller
{
    public function update(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'sepultura_id' => ['required', 'integer', 'exists:cemn_sepulturas,id'],
        ]);

        $difunto = CemnDifunto::query()->findOrFail($id);

        DB::transaction(function () use ($difunto, $data) {
            /** @var CemnSepultura $sepultura */
            $sepultura = CemnSepultura::query()
                ->lockForUpdate()
                ->findOrFail($data['sepultura_id']);

            if ($sepultura->estado === CemnSepultura::ESTADO_CLAUSURADA) {
                abort(422, 'No se puede asignar un difunto a una sepultura clausurada.');
            }

            $difunto->sepultura_id = $sepultura->id;
            // Si no tenía titular en la sepultura, marcar como titular
            $hayTitular = CemnDifunto::query()
                ->where('sepultura_id', $sepultura->id)
                ->where('es_titular', true)
                ->exists();
            if (!$hayTitular) {
                $difunto->es_titular = true;
            }
            $difunto->save();

            if ($sepultura->estado !== CemnSepultura::ESTADO_OCUPADA) {
                $sepultura->estado = CemnSepultura::ESTADO_OCUPADA;
                $sepultura->save();
            }
        });

        return response()->json([
            'message' => 'Difunto asignado correctamente.',
            'item'    => $difunto->fresh(),
        ]);
    }
}
