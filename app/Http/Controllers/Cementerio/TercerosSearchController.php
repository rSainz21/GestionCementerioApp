<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnTercero;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TercerosSearchController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));
        $limit = min(max((int) $request->query('limit', 100), 1), 500);

        $query = CemnTercero::query();

        if (mb_strlen($q) >= 2) {
            $query->where(function ($qq) use ($q) {
                $qq->where('dni', 'like', "%{$q}%")
                    ->orWhere('nombre', 'like', "%{$q}%")
                    ->orWhere('apellido1', 'like', "%{$q}%")
                    ->orWhere('apellido2', 'like', "%{$q}%");
            });
        }

        $items = $query
            ->orderBy('apellido1')
            ->orderBy('apellido2')
            ->orderBy('nombre')
            ->limit(mb_strlen($q) >= 2 ? min($limit, 100) : $limit)
            ->get([
                'id',
                'dni',
                'nombre',
                'apellido1',
                'apellido2',
                'telefono',
                'direccion',
                'email',
            ])
            ->map(function ($t) {
                return [
                    'id' => $t->id,
                    'dni' => $t->dni,
                    'nombre' => $t->nombre,
                    'apellido1' => $t->apellido1,
                    'apellido2' => $t->apellido2,
                    'telefono' => $t->telefono,
                    'direccion' => $t->direccion,
                    'email' => $t->email,
                    'label' => trim(($t->dni ? $t->dni . ' — ' : '') . $t->nombre_completo),
                ];
            })
            ->values();

        return response()->json(['items' => $items]);
    }
}

