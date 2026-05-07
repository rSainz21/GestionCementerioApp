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

        if (mb_strlen($q) < 2) {
            return response()->json(['items' => []]);
        }

        $items = CemnTercero::query()
            ->where(function ($qq) use ($q) {
                $qq->where('dni', 'like', "%{$q}%")
                    ->orWhere('nombre', 'like', "%{$q}%")
                    ->orWhere('apellido1', 'like', "%{$q}%")
                    ->orWhere('apellido2', 'like', "%{$q}%");
            })
            ->orderBy('apellido1')
            ->orderBy('apellido2')
            ->orderBy('nombre')
            ->limit(15)
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

