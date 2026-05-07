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

        if (mb_strlen($q) < 2) {
            return response()->json(['items' => []]);
        }

        $items = CemnConcesion::query()
            ->where(function ($query) use ($q) {
                $query->whereHas('terceros', function ($qq) use ($q) {
                    $qq->where('dni', 'like', "%{$q}%")
                        ->orWhere('nombre', 'like', "%{$q}%")
                        ->orWhere('apellido1', 'like', "%{$q}%")
                        ->orWhere('apellido2', 'like', "%{$q}%")
                        ->orWhere('nombre_original', 'like', "%{$q}%");
                })->orWhereHas('difuntos', function ($qq) use ($q) {
                    $qq->where('nombre_completo', 'like', "%{$q}%");
                })->orWhere('numero_expediente', 'like', "%{$q}%");
            })
            ->with([
                'sepultura:id,codigo,zona_id,bloque_id,fila,columna,estado',
                'sepultura.zona:id,nombre',
                'sepultura.bloque:id,nombre,codigo',
                'terceros:id,nombre,apellido1,apellido2,dni,nombre_original',
                'difuntos:id,concesion_id,nombre_completo,fecha_fallecimiento,fecha_inhumacion,es_titular,parentesco',
            ])
            ->orderByDesc('id')
            ->limit(15)
            ->get()
            ->map(function (CemnConcesion $c) {
                $concesionario = $c->terceros->firstWhere('pivot.rol', 'concesionario')
                    ?? $c->terceros->first();

                $concesionarioNombre = $concesionario
                    ? trim($concesionario->nombre_original
                        ?? (($concesionario->nombre ?? '').' '.($concesionario->apellido1 ?? '').' '.($concesionario->apellido2 ?? '')))
                    : null;

                $ubicacion = trim(implode(' · ', array_filter([
                    $c->sepultura?->codigo ? ('Unidad '.$c->sepultura->codigo) : null,
                    $c->sepultura?->bloque?->nombre ? ('Bloque '.$c->sepultura->bloque->nombre) : null,
                    $c->sepultura?->zona?->nombre ? ('Zona '.$c->sepultura->zona->nombre) : null,
                ])));

                $difuntos = $c->difuntos->map(fn ($d) => [
                    'id'                  => $d->id,
                    'nombre_completo'     => $d->nombre_completo,
                    'fecha_fallecimiento' => optional($d->fecha_fallecimiento)->toDateString(),
                    'fecha_inhumacion'    => optional($d->fecha_inhumacion)->toDateString(),
                    'es_titular'          => (bool) $d->es_titular,
                    'parentesco'          => $d->parentesco,
                ])->values();

                return [
                    'id'                => $c->id,
                    'sepultura_id'      => $c->sepultura_id,
                    'sepultura_codigo'  => $c->sepultura?->codigo,
                    'zona_nombre'       => $c->sepultura?->zona?->nombre,
                    'bloque_nombre'     => $c->sepultura?->bloque?->nombre,
                    'numero_expediente' => $c->numero_expediente,
                    'tipo'              => $c->tipo,
                    'fecha_concesion'   => optional($c->fecha_concesion)->toDateString(),
                    'fecha_vencimiento' => optional($c->fecha_vencimiento)->toDateString(),
                    'duracion_anos'     => $c->duracion_anos,
                    'estado'            => $c->estado,
                    'concesionario'     => $concesionarioNombre,
                    'concesionario_dni' => $concesionario?->dni,
                    'difuntos'          => $difuntos,
                    'label'             => trim(implode(' — ', array_filter([
                        $concesionarioNombre ? ($concesionarioNombre.($concesionario?->dni ? ' ('.$concesionario->dni.')' : '')) : null,
                        $difuntos->isNotEmpty() ? $difuntos->pluck('nombre_completo')->implode(', ') : null,
                        $ubicacion ?: null,
                        $c->numero_expediente ? ('Exp. '.$c->numero_expediente) : null,
                    ]))),
                ];
            })
            ->values();

        return response()->json(['items' => $items]);
    }
}

