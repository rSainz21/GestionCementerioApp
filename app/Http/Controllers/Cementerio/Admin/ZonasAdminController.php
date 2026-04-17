<?php

namespace App\Http\Controllers\Cementerio\Admin;

use App\Http\Controllers\Controller;
use App\Models\CemnZona;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ZonasAdminController extends Controller
{
    public function index(): JsonResponse
    {
        $items = CemnZona::query()
            ->with('cementerio:id,nombre')
            ->orderBy('nombre')
            ->get()
            ->map(function (CemnZona $z) {
                return [
                    'id' => $z->id,
                    'cementerio_id' => $z->cementerio_id,
                    'cementerio_nombre' => $z->cementerio?->nombre,
                    'codigo' => $z->codigo,
                    'nombre' => $z->nombre,
                    'descripcion' => $z->descripcion,
                ];
            })
            ->values();

        return response()->json(['items' => $items]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'cementerio_id' => 'required|integer|exists:cemn_cementerios,id',
            'codigo' => 'nullable|string|max:50',
            'nombre' => 'required|string|max:255',
            'descripcion' => 'nullable|string|max:2000',
        ]);

        $item = CemnZona::create($data);

        return response()->json(['item' => $item], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $item = CemnZona::query()->findOrFail($id);

        $data = $request->validate([
            'cementerio_id' => 'required|integer|exists:cemn_cementerios,id',
            'codigo' => 'nullable|string|max:50',
            'nombre' => 'required|string|max:255',
            'descripcion' => 'nullable|string|max:2000',
        ]);

        $item->update($data);

        return response()->json(['item' => $item]);
    }

    public function destroy(int $id): JsonResponse
    {
        $item = CemnZona::query()->findOrFail($id);
        $item->delete();
        return response()->json(['ok' => true]);
    }
}

