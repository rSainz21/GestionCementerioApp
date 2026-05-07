<?php

namespace App\Http\Controllers\Cementerio\Admin;

use App\Http\Controllers\Controller;
use App\Models\CemnZona;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ZonasAdminController extends Controller
{
    private function centroidFromPolygon(?array $polygon): ?array
    {
        if (!is_array($polygon) || count($polygon) < 3) return null;
        $sumLat = 0.0; $sumLon = 0.0; $n = 0;
        foreach ($polygon as $p) {
            if (!is_array($p)) continue;
            $lat = $p['lat'] ?? null;
            $lon = $p['lon'] ?? null;
            if (!is_numeric($lat) || !is_numeric($lon)) continue;
            $sumLat += (float) $lat;
            $sumLon += (float) $lon;
            $n++;
        }
        if ($n === 0) return null;
        return ['lat' => $sumLat / $n, 'lon' => $sumLon / $n];
    }

    public function index(): JsonResponse
    {
        $items = CemnZona::query()
            ->with('cementerio:id,nombre')
            ->orderBy('nombre')
            ->get()
            ->map(function (CemnZona $z) {
                return [
                    'id'                => $z->id,
                    'cementerio_id'     => $z->cementerio_id,
                    'cementerio_nombre' => $z->cementerio?->nombre,
                    'codigo'            => $z->codigo,
                    'nombre'            => $z->nombre,
                    'descripcion'       => $z->descripcion,
                    'lat'               => $z->lat ? (float) $z->lat : null,
                    'lon'               => $z->lon ? (float) $z->lon : null,
                    'polygon'           => $z->polygon,
                ];
            })
            ->values();

        return response()->json(['items' => $items]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'cementerio_id' => 'required|integer|exists:cemn_cementerios,id',
            'codigo'        => 'nullable|string|max:50',
            'nombre'        => 'required|string|max:255',
            'descripcion'   => 'nullable|string|max:2000',
            'lat'           => 'nullable|numeric',
            'lon'           => 'nullable|numeric',
            'polygon'       => 'nullable|array',
            'polygon.*.lat' => 'required_with:polygon|numeric',
            'polygon.*.lon' => 'required_with:polygon|numeric',
        ]);

        if (!empty($data['polygon'])) {
            $centroid = $this->centroidFromPolygon($data['polygon']);
            if ($centroid) {
                $data['lat'] = $centroid['lat'];
                $data['lon'] = $centroid['lon'];
            }
        }

        $item = CemnZona::create($data);

        return response()->json(['item' => $item], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $item = CemnZona::query()->findOrFail($id);

        $data = $request->validate([
            'cementerio_id' => 'required|integer|exists:cemn_cementerios,id',
            'codigo'        => 'nullable|string|max:50',
            'nombre'        => 'required|string|max:255',
            'descripcion'   => 'nullable|string|max:2000',
            'lat'           => 'nullable|numeric',
            'lon'           => 'nullable|numeric',
            'polygon'       => 'nullable|array',
            'polygon.*.lat' => 'required_with:polygon|numeric',
            'polygon.*.lon' => 'required_with:polygon|numeric',
        ]);

        if (!empty($data['polygon'])) {
            $centroid = $this->centroidFromPolygon($data['polygon']);
            if ($centroid) {
                $data['lat'] = $centroid['lat'];
                $data['lon'] = $centroid['lon'];
            }
        }

        $item->update($data);

        return response()->json(['item' => $item]);
    }

    public function destroy(int $id): JsonResponse
    {
        $item = CemnZona::query()->findOrFail($id);
        $item->delete();
        return response()->json(['ok' => true]);
    }
}
