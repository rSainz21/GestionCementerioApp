<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnSepultura;
use Illuminate\Http\JsonResponse;

class CementerioStatsController extends Controller
{
    public function index(): JsonResponse
    {
        $base = CemnSepultura::query();

        return response()->json([
            'libres' => (clone $base)->where('estado', CemnSepultura::ESTADO_LIBRE)->count(),
            'ocupadas' => (clone $base)->where('estado', CemnSepultura::ESTADO_OCUPADA)->count(),
            'reservadas' => (clone $base)->where('estado', CemnSepultura::ESTADO_RESERVADA)->count(),
            'clausuradas' => (clone $base)->where('estado', CemnSepultura::ESTADO_CLAUSURADA)->count(),
        ]);
    }
}

