<?php

namespace App\Http\Controllers\Cementerio\Admin;

use App\Http\Controllers\Controller;
use App\Models\CemnSepultura;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SepulturasAdminController extends Controller
{
    public function index(): JsonResponse
    {
        $items = CemnSepultura::query()
            ->with(['zona:id,nombre', 'bloque:id,nombre'])
            ->orderBy('id', 'desc')
            ->limit(500)
            ->get()
            ->map(function (CemnSepultura $s) {
                return [
                    'id' => $s->id,
                    'zona_id' => $s->zona_id,
                    'zona_nombre' => $s->zona?->nombre,
                    'bloque_id' => $s->bloque_id,
                    'bloque_nombre' => $s->bloque?->nombre,
                    'fila' => $s->fila,
                    'columna' => $s->columna,
                    'codigo' => $s->codigo,
                    'tipo' => $s->tipo,
                    'estado' => $s->estado,
                    'notas' => $s->notas,
                ];
            })
            ->values();

        return response()->json(['items' => $items]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'zona_id' => 'required|integer|exists:cemn_zonas,id',
            'bloque_id' => 'nullable|integer|exists:cemn_bloques,id',
            'fila' => 'nullable|integer|min:1|max:500',
            'columna' => 'nullable|integer|min:1|max:500',
            'codigo' => 'nullable|string|max:80',
            'tipo' => 'nullable|string|max:50',
            'estado' => 'required|string|in:libre,ocupada,reservada,clausurada',
            'notas' => 'nullable|string|max:2000',
        ]);

        $item = CemnSepultura::create($data);
        return response()->json(['item' => $item], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $item = CemnSepultura::query()->findOrFail($id);

        $data = $request->validate([
            'zona_id' => 'required|integer|exists:cemn_zonas,id',
            'bloque_id' => 'nullable|integer|exists:cemn_bloques,id',
            'fila' => 'nullable|integer|min:1|max:500',
            'columna' => 'nullable|integer|min:1|max:500',
            'codigo' => 'nullable|string|max:80',
            'tipo' => 'nullable|string|max:50',
            'estado' => 'required|string|in:libre,ocupada,reservada,clausurada',
            'notas' => 'nullable|string|max:2000',
        ]);

        $item->update($data);
        return response()->json(['item' => $item]);
    }

    public function destroy(int $id): JsonResponse
    {
        $item = CemnSepultura::query()->findOrFail($id);
        $item->delete();
        return response()->json(['ok' => true]);
    }
}

