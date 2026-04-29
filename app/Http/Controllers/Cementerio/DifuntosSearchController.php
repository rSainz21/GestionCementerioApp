<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnDifunto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DifuntosSearchController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));
        $limit = min(max((int) $request->query('limit', 100), 1), 500);

        $query = CemnDifunto::query()
            ->with([
                'tercero:id,dni,nombre,apellido1,apellido2',
                'sepultura:id,codigo,numero,zona_id,bloque_id,fila,columna,estado',
                'sepultura.zona:id,nombre',
                'sepultura.bloque:id,nombre,codigo',
            ])
            ->orderByDesc('id');

        if (mb_strlen($q) >= 2) {
            $query->where(function ($qq) use ($q) {
                $qq->where('nombre_completo', 'like', "%{$q}%")
                    ->orWhereHas('tercero', function ($qt) use ($q) {
                        $qt->where('dni', 'like', "%{$q}%")
                            ->orWhere('nombre', 'like', "%{$q}%")
                            ->orWhere('apellido1', 'like', "%{$q}%")
                            ->orWhere('apellido2', 'like', "%{$q}%");
                    });
            });
        }

        $items = $query->limit(mb_strlen($q) >= 2 ? min($limit, 100) : $limit)
            ->get()
            ->map(function (CemnDifunto $d) {
                $dni = $d->tercero?->dni;

                $ubicacion = trim(implode(' · ', array_filter([
                    $d->sepultura?->codigo ? ('Unidad '.$d->sepultura->codigo) : null,
                    $d->sepultura?->bloque?->codigo ? ('Bloque '.$d->sepultura->bloque->codigo) : null,
                    $d->sepultura?->zona?->nombre ? ('Zona '.$d->sepultura->zona->nombre) : null,
                ])));

                return [
                    'id' => $d->id,
                    'sepultura_id' => $d->sepultura_id,
                    'nombre_completo' => $d->nombre_completo,
                    'dni' => $dni,
                    'fecha_fallecimiento' => optional($d->fecha_fallecimiento)->toDateString(),
                    'fecha_inhumacion' => optional($d->fecha_inhumacion)->toDateString(),
                    'sepultura_codigo' => $d->sepultura?->codigo,
                    'sepultura_numero' => $d->sepultura?->numero,
                    'bloque_codigo' => $d->sepultura?->bloque?->codigo,
                    'bloque_nombre' => $d->sepultura?->bloque?->nombre,
                    'zona_nombre' => $d->sepultura?->zona?->nombre,
                    'label' => trim(implode(' — ', array_filter([
                        $d->nombre_completo ? ($d->nombre_completo.($dni ? ' ('.$dni.')' : '')) : null,
                        $ubicacion ?: null,
                    ]))),
                ];
            })
            ->values();

        return response()->json(['items' => $items]);
    }
}

