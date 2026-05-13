<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnPersona;
use App\Models\CemnSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PersonaSinSepulturaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));

        $maxCap       = CemnSetting::intRange('regularizacion_limite_maximo', 500, 50, 2000);
        $defaultLimit = CemnSetting::intRange('regularizacion_filas_por_carga', 50, 10, $maxCap);
        $limit        = min((int) $request->query('limit', $defaultLimit), $maxCap);
        $offset = max((int) $request->query('offset', 0), 0);

        $base = CemnPersona::query()
            ->sinSepultura()
            ->when($q !== '', fn ($query) => $query->buscar($q))
            ->orderBy('nombre_completo')
            ->orderBy('nombre');

        $total = $base->count();

        $items = $base->skip($offset)->limit($limit)
            ->get(['id', 'tipo', 'nombre_completo', 'nombre', 'apellido1', 'apellido2',
                   'fecha_fallecimiento', 'fecha_inhumacion', 'parentesco', 'notas']);

        return response()->json(['items' => $items, 'total' => $total]);
    }
}
