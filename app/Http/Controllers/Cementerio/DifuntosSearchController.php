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

        if (mb_strlen($q) < 2) {
            return response()->json(['items' => []]);
        }

        $items = CemnDifunto::query()
            ->where(function ($qq) use ($q) {
                $qq->where('nombre_completo', 'like', "%{$q}%")
                    ->orWhereHas('tercero', function ($qt) use ($q) {
                        $qt->where('dni', 'like', "%{$q}%")
                            ->orWhere('nombre', 'like', "%{$q}%")
                            ->orWhere('apellido1', 'like', "%{$q}%")
                            ->orWhere('apellido2', 'like', "%{$q}%");
                    });
            })
            ->with([
                'tercero:id,dni,nombre,apellido1,apellido2',
                'sepultura:id,codigo,zona_id,bloque_id,fila,columna,estado',
                'sepultura.zona:id,nombre',
                'sepultura.bloque:id,nombre,codigo',
            ])
            ->orderByDesc('id')
            ->limit(15)
            ->get()
            ->map(function (CemnDifunto $d) {
                $dni = $d->tercero?->dni;

                $ubicacion = trim(implode(' · ', array_filter([
                    $d->sepultura?->codigo ? ('Unidad '.$d->sepultura->codigo) : null,
                    $d->sepultura?->bloque?->nombre ? ('Bloque '.$d->sepultura->bloque->nombre) : null,
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

