<?php

namespace App\Http\Controllers\Cementerio\Admin;

use App\Http\Controllers\Controller;
use App\Models\CemnDifunto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DifuntosAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));

        $query = CemnDifunto::query()
            ->with([
                'sepultura:id,codigo',
                'concesion:id,numero_expediente',
            ]);

        if ($q !== '') {
            $query->where('nombre_completo', 'like', "%{$q}%");
        }

        $items = $query->orderBy('nombre_completo')
            ->limit(1000)
            ->get()
            ->map(fn (CemnDifunto $d) => [
                'id'                  => $d->id,
                'nombre_completo'     => $d->nombre_completo,
                'fecha_fallecimiento' => optional($d->fecha_fallecimiento)->toDateString(),
                'fecha_inhumacion'    => optional($d->fecha_inhumacion)->toDateString(),
                'es_titular'          => (bool) $d->es_titular,
                'parentesco'          => $d->parentesco,
                'sepultura_codigo'    => $d->sepultura?->codigo,
                'expediente'          => $d->concesion?->numero_expediente,
                'notas'               => $d->notas,
            ])
            ->values();

        return response()->json(['items' => $items]);
    }
}
