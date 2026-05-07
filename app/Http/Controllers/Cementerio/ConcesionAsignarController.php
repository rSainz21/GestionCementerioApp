<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnConcesion;
use App\Models\CemnSepultura;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ConcesionAsignarController extends Controller
{
    public function update(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'sepultura_id' => ['required', 'integer', 'exists:cemn_sepulturas,id'],
        ]);

        /** @var CemnConcesion $concesion */
        $concesion = CemnConcesion::query()->findOrFail($id);

        DB::transaction(function () use ($concesion, $data) {
            /** @var CemnSepultura $sepultura */
            $sepultura = CemnSepultura::query()
                ->lockForUpdate()
                ->findOrFail($data['sepultura_id']);

            if ($sepultura->estado === CemnSepultura::ESTADO_CLAUSURADA) {
                abort(422, 'No se puede asignar una concesión a una sepultura clausurada.');
            }

            $concesion->sepultura_id = $sepultura->id;
            $concesion->save();

            if ($sepultura->estado !== CemnSepultura::ESTADO_OCUPADA) {
                $sepultura->estado = CemnSepultura::ESTADO_OCUPADA;
                $sepultura->save();
            }
        });

        return response()->json([
            'message' => 'Concesión asignada correctamente.',
            'item' => $concesion->fresh(),
        ]);
    }
}
