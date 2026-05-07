<?php

namespace App\Http\Controllers\Cementerio\Admin;

use App\Http\Controllers\Controller;
use App\Models\CemnTercero;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TercerosAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));

        $query = CemnTercero::query()
            ->withCount('concesiones');

        if ($q !== '') {
            $query->where(function ($qq) use ($q) {
                $qq->where('nombre_original', 'like', "%{$q}%")
                    ->orWhere('dni', 'like', "%{$q}%")
                    ->orWhere('cif', 'like', "%{$q}%")
                    ->orWhere('razon_social', 'like', "%{$q}%");
            });
        }

        $items = $query->orderBy('nombre_original')
            ->limit(500)
            ->get()
            ->map(fn (CemnTercero $t) => [
                'id'               => $t->id,
                'nombre_original'  => $t->nombre_original,
                'nombre'           => $t->nombre,
                'apellido1'        => $t->apellido1,
                'apellido2'        => $t->apellido2,
                'dni'              => $t->dni,
                'es_empresa'       => (bool) $t->es_empresa,
                'cif'              => $t->cif,
                'razon_social'     => $t->razon_social,
                'notas'            => $t->notas,
                'concesiones_count'=> $t->concesiones_count,
            ])
            ->values();

        return response()->json(['items' => $items]);
    }
}
