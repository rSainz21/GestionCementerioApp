<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnBloque;
use App\Models\CemnZona;
use Illuminate\Http\Request;

class CementerioCatalogoController extends Controller
{
    /**
     * Catálogo base para el wizard:
     * - Zonas
     * - Bloques (opcionalmente filtrado por zona_id)
     */
    public function catalogo(Request $request)
    {
        $zonaId = $request->integer('zona_id');
        $cid    = $request->integer('cementerio_id') ?: null;

        $zonasQuery = CemnZona::query()->orderBy('nombre');
        if ($cid) {
            $zonasQuery->where('cementerio_id', $cid);
        }
        $zonas = $zonasQuery->get();

        $bloquesQuery = CemnBloque::query()->orderBy('nombre');
        if ($zonaId) {
            $bloquesQuery->where('zona_id', $zonaId);
        } elseif ($cid) {
            $bloquesQuery->whereHas('zona', fn ($q) => $q->where('cementerio_id', $cid));
        }

        $bloques = $bloquesQuery->get();

        return response()->json([
            'zonas' => $zonas,
            'bloques' => $bloques,
        ]);
    }
}

