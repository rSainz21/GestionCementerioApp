<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnDifunto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DifuntosSinAsignarController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));

        $items = CemnDifunto::query()
            ->whereNull('sepultura_id')
            ->when($q !== '', fn ($query) => $query->where('nombre_completo', 'like', "%{$q}%"))
            ->orderBy('nombre_completo')
            ->limit(300)
            ->get(['id', 'nombre_completo', 'fecha_fallecimiento', 'fecha_inhumacion', 'parentesco', 'notas']);

        return response()->json(['items' => $items]);
    }
}
