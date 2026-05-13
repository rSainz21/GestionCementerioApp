<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnSepultura;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CementerioStatsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $cid  = $request->integer('cementerio_id') ?: null;
        $base = CemnSepultura::query();
        if ($cid) {
            $base->whereHas('zona', fn ($q) => $q->where('cementerio_id', $cid));
        }

        return response()->json([
            'libres'   => (clone $base)->where('estado', CemnSepultura::ESTADO_LIBRE)->count(),
            'ocupadas' => (clone $base)->where('estado', CemnSepultura::ESTADO_OCUPADA)->count(),
        ]);
    }
}

