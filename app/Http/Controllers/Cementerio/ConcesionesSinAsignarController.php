<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnConcesion;
use App\Models\CemnSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConcesionesSinAsignarController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));

        $maxCap       = CemnSetting::intRange('regularizacion_limite_maximo', 500, 50, 2000);
        $defaultLimit = CemnSetting::intRange('regularizacion_filas_por_carga', 50, 10, $maxCap);
        $limit        = min((int) $request->query('limit', $defaultLimit), $maxCap);
        $offset = max((int) $request->query('offset', 0), 0);

        $base = CemnConcesion::query()
            ->whereNull('sepultura_id')
            ->when($q !== '', function ($query) use ($q) {
                $query->where(function ($inner) use ($q) {
                    $inner->where('numero_expediente', 'like', "%{$q}%")
                        ->orWhereHas('personas', function ($thirdQuery) use ($q) {
                            $thirdQuery->where('dni', 'like', "%{$q}%")
                                ->orWhere('nombre_original', 'like', "%{$q}%")
                                ->orWhere('nombre', 'like', "%{$q}%")
                                ->orWhere('nombre_completo', 'like', "%{$q}%");
                        });
                });
            })
            ->orderByDesc('id');

        $total = $base->count();

        $items = $base->skip($offset)->limit($limit)
            ->with(['personas:id,tipo,nombre,apellido1,apellido2,nombre_completo,nombre_original,dni'])
            ->get()
            ->map(fn (CemnConcesion $c) => [
                'id'                => $c->id,
                'numero_expediente' => $c->numero_expediente,
                'tipo'              => $c->tipo,
                'estado'            => $c->estado,
                'fecha_concesion'   => $c->fecha_concesion?->format('d/m/Y'),
                'terceros'          => $c->personas->map(fn ($p) => [
                    'id'             => $p->id,
                    'nombre_original'=> $p->nombre_original ?? $p->nombre_display,
                    'nombre_display' => $p->nombre_display,
                    'dni'            => $p->dni,
                    'rol'            => $p->pivot->rol ?? null,
                ])->values(),
            ])
            ->values();

        return response()->json(['items' => $items, 'total' => $total]);
    }
}
