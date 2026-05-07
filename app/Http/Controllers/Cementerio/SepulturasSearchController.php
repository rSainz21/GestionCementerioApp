<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnSepultura;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SepulturasSearchController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));
        if (mb_strlen($q) < 2) {
            return response()->json(['items' => []]);
        }

        $query = CemnSepultura::query()
            ->with([
                'bloque:id,codigo',
                'zona:id,nombre',
            ])
            ->orderBy('id')
            ->limit(25);

        if (preg_match('/^\d+$/', $q)) {
            $n = (int) $q;
            $query->where(function ($w) use ($n) {
                $w->where('numero', $n)->orWhere('id', $n);
            });
        } else {
            $query->where(function ($w) use ($q) {
                $w->where('codigo', 'like', "%{$q}%")
                  ->orWhere('ubicacion_texto', 'like', "%{$q}%");
            });
        }

        $items = $query->get([
            'id',
            'zona_id',
            'bloque_id',
            'codigo',
            'numero',
            'estado',
            'fila',
            'columna',
        ])->map(function (CemnSepultura $s) {
            return [
                'id' => $s->id,
                'zona_id' => $s->zona_id,
                'zona_nombre' => $s->zona?->nombre,
                'bloque_id' => $s->bloque_id,
                'bloque_codigo' => $s->bloque?->codigo,
                'codigo' => $s->codigo,
                'numero' => $s->numero,
                'estado' => $s->estado,
                'fila' => $s->fila,
                'columna' => $s->columna,
            ];
        })->values();

        return response()->json(['items' => $items]);
    }
}

