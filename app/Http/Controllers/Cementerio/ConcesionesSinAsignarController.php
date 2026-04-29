<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnConcesion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConcesionesSinAsignarController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));

        $items = CemnConcesion::query()
            ->whereNull('sepultura_id')
            ->with([
                'terceros:id,nombre,apellido1,apellido2,nombre_original,dni',
            ])
            ->when($q !== '', function ($query) use ($q) {
                $query->where(function ($inner) use ($q) {
                    $inner->where('numero_expediente', 'like', "%{$q}%")
                        ->orWhereHas('terceros', function ($thirdQuery) use ($q) {
                            $thirdQuery->where('dni', 'like', "%{$q}%")
                                ->orWhere('nombre', 'like', "%{$q}%")
                                ->orWhere('apellido1', 'like', "%{$q}%")
                                ->orWhere('apellido2', 'like', "%{$q}%")
                                ->orWhere('nombre_original', 'like', "%{$q}%");
                        });
                });
            })
            ->orderByDesc('id')
            ->limit(300)
            ->get()
            ->map(function (CemnConcesion $concesion) {
                $concesionario = $concesion->terceros->firstWhere('pivot.rol', 'concesionario')
                    ?? $concesion->terceros->first();

                $nombre = trim((string) (
                    $concesionario?->nombre_original
                    ?: (($concesionario?->nombre ?? '') . ' ' . ($concesionario?->apellido1 ?? '') . ' ' . ($concesionario?->apellido2 ?? ''))
                ));

                return [
                    'id' => $concesion->id,
                    'numero_expediente' => $concesion->numero_expediente,
                    'tipo' => $concesion->tipo,
                    'estado' => $concesion->estado,
                    'concesionario' => $nombre !== '' ? $nombre : null,
                    'concesionario_dni' => $concesionario?->dni,
                ];
            })
            ->values();

        return response()->json(['items' => $items]);
    }
}
