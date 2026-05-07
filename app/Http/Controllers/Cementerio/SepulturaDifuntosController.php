<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnSepultura;
use Illuminate\Http\JsonResponse;

class SepulturaDifuntosController extends Controller
{
    public function index(int $id): JsonResponse
    {
        /** @var CemnSepultura $sepultura */
        $sepultura = CemnSepultura::query()->findOrFail($id);

        $items = $sepultura->difuntos()
            ->orderBy('id')
            ->get();

        return response()->json(['items' => $items]);
    }
}

