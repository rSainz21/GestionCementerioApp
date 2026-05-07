<?php

namespace App\Http\Controllers\Cementerio\Admin;

use App\Http\Controllers\Controller;
use App\Models\CemnCementerio;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CementeriosAdminController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'items' => CemnCementerio::query()->orderBy('nombre')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:255',
            'municipio' => 'nullable|string|max:255',
            'direccion' => 'nullable|string|max:255',
            'lat' => 'nullable|numeric',
            'lon' => 'nullable|numeric',
            'notas' => 'nullable|string|max:2000',
        ]);

        $item = CemnCementerio::create($data);

        return response()->json(['item' => $item], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $item = CemnCementerio::query()->findOrFail($id);

        $data = $request->validate([
            'nombre' => 'required|string|max:255',
            'municipio' => 'nullable|string|max:255',
            'direccion' => 'nullable|string|max:255',
            'lat' => 'nullable|numeric',
            'lon' => 'nullable|numeric',
            'notas' => 'nullable|string|max:2000',
        ]);

        $item->update($data);

        return response()->json(['item' => $item]);
    }

    public function destroy(int $id): JsonResponse
    {
        $item = CemnCementerio::query()->findOrFail($id);
        $item->delete();
        return response()->json(['ok' => true]);
    }
}

