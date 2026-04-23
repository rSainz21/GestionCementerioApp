<?php

namespace App\Http\Controllers\Cementerio\Admin;

use App\Http\Controllers\Controller;
use App\Models\CemnBloque;
use App\Models\CemnSepultura;
use App\Models\CemnZona;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BloquesAdminController extends Controller
{
    public function index(): JsonResponse
    {
        $items = CemnBloque::query()
            ->with('zona:id,nombre')
            ->orderBy('nombre')
            ->get()
            ->map(function (CemnBloque $b) {
                return [
                    'id' => $b->id,
                    'zona_id' => $b->zona_id,
                    'zona_nombre' => $b->zona?->nombre,
                    'codigo' => $b->codigo,
                    'nombre' => $b->nombre,
                    'tipo' => $b->tipo,
                    'filas' => $b->filas,
                    'columnas' => $b->columnas,
                    'numero_inicio' => $b->numero_inicio,
                    'numeracion_horizontal' => $b->numeracion_horizontal,
                    'numeracion_vertical' => $b->numeracion_vertical,
                    'descripcion' => $b->descripcion,
                ];
            })
            ->values();

        return response()->json(['items' => $items]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'zona_id' => 'required|integer|exists:cemn_zonas,id',
            'codigo' => 'required|string|max:50',
            'nombre' => 'required|string|max:255',
            'tipo' => 'required|string|max:50',
            'filas' => 'required|integer|min:1|max:200',
            'columnas' => 'required|integer|min:1|max:200',
            'numero_inicio' => 'nullable|integer|min:1|max:1000000',
            'numeracion_horizontal' => 'nullable|string|in:->,<-',
            'numeracion_vertical' => 'nullable|string|in:down,up',
            'descripcion' => 'nullable|string|max:2000',
            'lat' => 'nullable|numeric',
            'lon' => 'nullable|numeric',
        ]);

        $item = DB::transaction(function () use ($data) {
            $numeracionHorizontal = $data['numeracion_horizontal'] ?? '->';
            $numeracionVertical = $data['numeracion_vertical'] ?? 'down';

            // OJO: en algunos frontends/serializadores el campo puede llegar omitido o null.
            // Aquí lo garantizamos SIEMPRE para evitar que se generen sepulturas empezando por 0.
            $startNumero = $data['numero_inicio'] ?? null;
            if ($startNumero === null) {
                $max = (int) (CemnSepultura::query()->max('numero') ?? 0);
                $startNumero = $max + 1;
            }

            $bloque = CemnBloque::create([
                ...$data,
                'numero_inicio' => $startNumero,
                'numeracion_horizontal' => $numeracionHorizontal,
                'numeracion_vertical' => $numeracionVertical,
            ]);

            $tipoUnidad = $bloque->tipo === 'columbarios' ? 'columbario' : 'nicho';
            $now = now();

            $zona = CemnZona::query()->select(['id', 'codigo'])->find($bloque->zona_id);
            $zonaCodigo = $zona?->codigo ?: 'Z';
            $prefix = $tipoUnidad === 'columbario' ? 'C' : 'N';

            $colOrder = range(1, (int) $bloque->columnas);
            $rowOrder = range(1, (int) $bloque->filas);
            if ($numeracionHorizontal === '<-') {
                $colOrder = array_reverse($colOrder);
            }
            if ($numeracionVertical === 'up') {
                $rowOrder = array_reverse($rowOrder);
            }

            $numero = (int) $startNumero;

            $toInsert = [];
            foreach ($colOrder as $columna) {
                foreach ($rowOrder as $fila) {
                    $toInsert[] = [
                        'zona_id' => $bloque->zona_id,
                        'bloque_id' => $bloque->id,
                        'tipo' => $tipoUnidad,
                        'numero' => $numero,
                        'fila' => $fila,
                        'columna' => $columna,
                        'codigo' => sprintf('%s-%s-%s%d', $zonaCodigo, $bloque->codigo, $prefix, $numero),
                        'estado' => CemnSepultura::ESTADO_LIBRE,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                    $numero++;
                }
            }

            if (!empty($toInsert)) {
                CemnSepultura::query()->insert($toInsert);
            }

            return $bloque;
        });

        return response()->json(['item' => $item], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $item = CemnBloque::query()->findOrFail($id);

        $data = $request->validate([
            'zona_id' => 'required|integer|exists:cemn_zonas,id',
            'codigo' => 'required|string|max:50',
            'nombre' => 'required|string|max:255',
            'tipo' => 'required|string|max:50',
            'filas' => 'required|integer|min:1|max:200',
            'columnas' => 'required|integer|min:1|max:200',
            'numero_inicio' => 'nullable|integer|min:1|max:1000000',
            'numeracion_horizontal' => 'nullable|string|in:->,<-',
            'numeracion_vertical' => 'nullable|string|in:down,up',
            'descripcion' => 'nullable|string|max:2000',
            'lat' => 'nullable|numeric',
            'lon' => 'nullable|numeric',
        ]);

        $item->update($data);

        return response()->json(['item' => $item]);
    }

    public function destroy(int $id): JsonResponse
    {
        $item = CemnBloque::query()->findOrFail($id);
        $item->delete();
        return response()->json(['ok' => true]);
    }
}

