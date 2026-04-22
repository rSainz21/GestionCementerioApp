<?php

namespace App\Http\Controllers\Cementerio\Admin;

use App\Http\Controllers\Controller;
use App\Models\CemnBloque;
use App\Models\CemnSepultura;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BloquesAdminController extends Controller
{
    public function index(): JsonResponse
    {
        $items = CemnBloque::query()
            ->with('zona:id,nombre')
            ->orderBy('nombre')
            ->get()
            ->map(function (CemnBloque $b) {
                return [
                    'id' => $b->id,
                    'zona_id' => $b->zona_id,
                    'zona_nombre' => $b->zona?->nombre,
                    'codigo' => $b->codigo,
                    'nombre' => $b->nombre,
                    'tipo' => $b->tipo,
                    'filas' => $b->filas,
                    'columnas' => $b->columnas,
                    'descripcion' => $b->descripcion,
                ];
            })
            ->values();

        return response()->json(['items' => $items]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'zona_id' => 'required|integer|exists:cemn_zonas,id',
            'codigo' => 'required|string|max:50',
            'nombre' => 'required|string|max:255',
            'tipo' => 'required|string|max:50',
            'filas' => 'required|integer|min:1|max:200',
            'columnas' => 'required|integer|min:1|max:200',
            'descripcion' => 'nullable|string|max:2000',
            'lat' => 'nullable|numeric',
            'lon' => 'nullable|numeric',
        ]);

        $item = DB::transaction(function () use ($data) {
            $bloque = CemnBloque::create($data);

            $tipoUnidad = $bloque->tipo === 'columbarios' ? 'columbario' : 'nicho';
            $now = now();

            $rows = [];
            for ($fila = 1; $fila <= $bloque->filas; $fila++) {
                for ($columna = 1; $columna <= $bloque->columnas; $columna++) {
                    $rows[] = [
                        'zona_id' => $bloque->zona_id,
                        'bloque_id' => $bloque->id,
                        'tipo' => $tipoUnidad,
                        'fila' => $fila,
                        'columna' => $columna,
                        'codigo' => CemnSepultura::generarCodigo($bloque, $fila, $columna),
                        'estado' => CemnSepultura::ESTADO_LIBRE,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
            }

            if (!empty($rows)) {
                CemnSepultura::query()->insert($rows);
            }

            return $bloque;
        });

        return response()->json(['item' => $item], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $item = CemnBloque::query()->findOrFail($id);

        $data = $request->validate([
            'zona_id' => 'required|integer|exists:cemn_zonas,id',
            'codigo' => 'required|string|max:50',
            'nombre' => 'required|string|max:255',
            'tipo' => 'required|string|max:50',
            'filas' => 'required|integer|min:1|max:200',
            'columnas' => 'required|integer|min:1|max:200',
            'descripcion' => 'nullable|string|max:2000',
            'lat' => 'nullable|numeric',
            'lon' => 'nullable|numeric',
        ]);

        $item->update($data);

        return response()->json(['item' => $item]);
    }

    public function destroy(int $id): JsonResponse
    {
        $item = CemnBloque::query()->findOrFail($id);
        $item->delete();
        return response()->json(['ok' => true]);
    }
}

