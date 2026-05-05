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

        $libres = (clone $base)->where('estado', CemnSepultura::ESTADO_LIBRE)->count();
        $ocupadas = (clone $base)->where('estado', CemnSepultura::ESTADO_OCUPADA)->count();
        $reservadas = (clone $base)->where('estado', CemnSepultura::ESTADO_RESERVADA)->count();
        $clausuradas = (clone $base)->where('estado', CemnSepultura::ESTADO_CLAUSURADA)->count();
        $mantenimiento = (clone $base)->where('estado', CemnSepultura::ESTADO_MANTENIMIENTO)->count();
        $total = (clone $base)->count();

        return response()->json([
            'libres' => $libres,
            'ocupadas' => $ocupadas,
            'reservadas' => $reservadas,
            'clausuradas' => $clausuradas,
            'mantenimiento' => $mantenimiento,
            /** Inventario total (alias para clientes que esperaban otro nombre). */
            'total' => $total,
            'sepulturas_total' => $total,
        ]);
    }
}

