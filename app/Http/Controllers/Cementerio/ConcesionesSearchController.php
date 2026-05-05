<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnConcesion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConcesionesSearchController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));
        $limit = min(max((int) $request->query('limit', 100), 1), 500);
        $page = max((int) $request->query('page', 1), 1);
        $effectiveLimit = mb_strlen($q) >= 2 ? min($limit, 100) : $limit;
        $offset = ($page - 1) * $effectiveLimit;

        $query = CemnConcesion::query()
            ->with([
                'sepultura:id,codigo,numero,zona_id,bloque_id,fila,columna,estado',
                'sepultura.zona:id,nombre',
                'sepultura.bloque:id,nombre,codigo',
                'terceros:id,nombre,apellido1,apellido2,dni',
            ])
            ->orderByDesc('id');

        if (mb_strlen($q) >= 2) {
            $query->where(function ($w) use ($q) {
                $w->where('numero_expediente', 'like', "%{$q}%")
                    ->orWhereHas('terceros', function ($qq) use ($q) {
                        $qq->where('dni', 'like', "%{$q}%")
                            ->orWhere('nombre', 'like', "%{$q}%")
                            ->orWhere('apellido1', 'like', "%{$q}%")
                            ->orWhere('apellido2', 'like', "%{$q}%");
                    });
            });
        }

        $items = $query
            ->offset($offset)
            ->limit($effectiveLimit)
            ->get()
            ->map(function (CemnConcesion $c) {
                $concesionario = $c->terceros->firstWhere('pivot.rol', 'concesionario')
                    ?? $c->terceros->first();

                $concesionarioNombre = $concesionario
                    ? trim(($concesionario->nombre ?? '').' '.($concesionario->apellido1 ?? '').' '.($concesionario->apellido2 ?? ''))
                    : null;

                $ubicacion = trim(implode(' · ', array_filter([
                    $c->sepultura?->codigo ? ('Unidad '.$c->sepultura->codigo) : null,
                    $c->sepultura?->bloque?->codigo ? ('Bloque '.$c->sepultura->bloque->codigo) : null,
                    $c->sepultura?->zona?->nombre ? ('Zona '.$c->sepultura->zona->nombre) : null,
                ])));

                return [
                    'id' => $c->id,
                    'sepultura_id' => $c->sepultura_id,
                    'sepultura_codigo' => $c->sepultura?->codigo,
                    'sepultura_numero' => $c->sepultura?->numero,
                    'bloque_codigo' => $c->sepultura?->bloque?->codigo,
                    'zona_nombre' => $c->sepultura?->zona?->nombre,
                    'bloque_nombre' => $c->sepultura?->bloque?->nombre,
                    'numero_expediente' => $c->numero_expediente,
                    'tipo' => $c->tipo,
                    'fecha_concesion' => optional($c->fecha_concesion)->toDateString(),
                    'fecha_vencimiento' => optional($c->fecha_vencimiento)->toDateString(),
                    'duracion_anos' => $c->duracion_anos,
                    'estado' => $c->estado,
                    'concesionario' => $concesionarioNombre,
                    'concesionario_dni' => $concesionario?->dni,
                    'label' => trim(implode(' — ', array_filter([
                        $concesionarioNombre ? ($concesionarioNombre.($concesionario?->dni ? ' ('.$concesionario->dni.')' : '')) : null,
                        $ubicacion ?: null,
                        $c->numero_expediente ? ('Exp. '.$c->numero_expediente) : null,
                    ]))),
                ];
            })
            ->values();

        return response()->json([
            'items' => $items,
            'meta' => [
                'page' => $page,
                'per_page' => $effectiveLimit,
                'has_more' => $items->count() === $effectiveLimit,
            ],
        ]);
    }
}

