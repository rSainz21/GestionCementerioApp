<?php

namespace App\Http\Controllers\Cementerio\Admin;

use App\Http\Controllers\Controller;
use App\Models\CemnBloque;
use App\Models\CemnSepultura;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BloquesAdminController extends Controller
{
    private const SENTIDOS = [
        'fila_lr_tb', // filas (arriba->abajo), columnas (izq->der)
        'fila_rl_tb', // filas (arriba->abajo), columnas (der->izq)
        'fila_lr_bt', // filas (abajo->arriba), columnas (izq->der)
        'fila_rl_bt', // filas (abajo->arriba), columnas (der->izq)
        'col_tb_lr',  // columnas (izq->der), filas (arriba->abajo)
        'col_bt_lr',  // columnas (izq->der), filas (abajo->arriba)
        'col_tb_rl',  // columnas (der->izq), filas (arriba->abajo)
        'col_bt_rl',  // columnas (der->izq), filas (abajo->arriba)
    ];

    private function iterCells(int $filas, int $columnas, string $sentido): array
    {
        $cells = [];

        $rowsAsc = range(1, $filas);
        $rowsDesc = array_reverse($rowsAsc);
        $colsAsc = range(1, $columnas);
        $colsDesc = array_reverse($colsAsc);

        switch ($sentido) {
            case 'fila_rl_tb':
                foreach ($rowsAsc as $f) foreach ($colsDesc as $c) $cells[] = [$f, $c];
                break;
            case 'fila_lr_bt':
                foreach ($rowsDesc as $f) foreach ($colsAsc as $c) $cells[] = [$f, $c];
                break;
            case 'fila_rl_bt':
                foreach ($rowsDesc as $f) foreach ($colsDesc as $c) $cells[] = [$f, $c];
                break;
            case 'col_tb_lr':
                foreach ($colsAsc as $c) foreach ($rowsAsc as $f) $cells[] = [$f, $c];
                break;
            case 'col_bt_lr':
                foreach ($colsAsc as $c) foreach ($rowsDesc as $f) $cells[] = [$f, $c];
                break;
            case 'col_tb_rl':
                foreach ($colsDesc as $c) foreach ($rowsAsc as $f) $cells[] = [$f, $c];
                break;
            case 'col_bt_rl':
                foreach ($colsDesc as $c) foreach ($rowsDesc as $f) $cells[] = [$f, $c];
                break;
            case 'fila_lr_tb':
            default:
                foreach ($rowsAsc as $f) foreach ($colsAsc as $c) $cells[] = [$f, $c];
                break;
        }

        return $cells;
    }

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
                    'sentido_numeracion' => $b->sentido_numeracion,
                    'numero_inicio' => $b->numero_inicio,
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
            'sentido_numeracion' => 'nullable|string|in:' . implode(',', self::SENTIDOS),
            'numero_inicio' => 'nullable|integer|min:1|max:1000000',
            'descripcion' => 'nullable|string|max:2000',
            'lat' => 'nullable|numeric',
            'lon' => 'nullable|numeric',
        ]);

        $item = DB::transaction(function () use ($data) {
            $data['sentido_numeracion'] = $data['sentido_numeracion'] ?? 'fila_lr_tb';
            $data['numero_inicio'] = isset($data['numero_inicio']) ? (int) $data['numero_inicio'] : 1;

            $bloque = CemnBloque::create($data);

            $tipoUnidad = $bloque->tipo === 'columbarios' ? 'columbario' : 'nicho';
            $now = now();

            $rows = [];
            $cells = $this->iterCells((int) $bloque->filas, (int) $bloque->columnas, (string) $bloque->sentido_numeracion);
            $numero = (int) ($bloque->numero_inicio ?? 1);
            foreach ($cells as $cell) {
                [$fila, $columna] = $cell;
                    $rows[] = [
                        'zona_id' => $bloque->zona_id,
                        'bloque_id' => $bloque->id,
                        'tipo' => $tipoUnidad,
                        'numero' => $numero,
                        'fila' => $fila,
                        'columna' => $columna,
                        'codigo' => CemnSepultura::generarCodigo($bloque, $fila, $columna),
                        'estado' => CemnSepultura::ESTADO_LIBRE,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                    $numero++;
            }

            if (!empty($rows)) {
                CemnSepultura::query()->insert($rows);
            }

            return $bloque;
        });

        return response()->json(['item' => $item], 201);
    }

    /**
     * Genera sepulturas para un bloque existente (si aún no tiene).
     * POST /api/cementerio/admin/bloques/{id}/generar-sepulturas
     */
    public function generarSepulturas(Request $request, int $id): JsonResponse
    {
        $bloque = CemnBloque::query()->findOrFail($id);

        $data = $request->validate([
            'sentido_numeracion' => 'nullable|string|in:' . implode(',', self::SENTIDOS),
            'numero_inicio' => 'nullable|integer|min:1|max:1000000',
            'forzar' => 'nullable|boolean',
        ]);

        $forzar = filter_var($data['forzar'] ?? false, FILTER_VALIDATE_BOOL);

        $exists = CemnSepultura::query()->where('bloque_id', $bloque->id)->exists();
        if ($exists && !$forzar) {
            return response()->json(['ok' => true, 'skipped' => true, 'reason' => 'ya_existen_sepulturas']);
        }

        $sentido = $data['sentido_numeracion'] ?? $bloque->sentido_numeracion ?? 'fila_lr_tb';
        $inicio = isset($data['numero_inicio']) ? (int) $data['numero_inicio'] : (int) ($bloque->numero_inicio ?? 1);

        DB::transaction(function () use ($bloque, $forzar, $sentido, $inicio) {
            if ($forzar) {
                CemnSepultura::query()->where('bloque_id', $bloque->id)->delete();
            }

            $tipoUnidad = $bloque->tipo === 'columbarios' ? 'columbario' : 'nicho';
            $now = now();

            $cells = $this->iterCells((int) $bloque->filas, (int) $bloque->columnas, (string) $sentido);
            $numero = $inicio;
            $rows = [];

            foreach ($cells as $cell) {
                [$fila, $columna] = $cell;
                $rows[] = [
                    'zona_id' => $bloque->zona_id,
                    'bloque_id' => $bloque->id,
                    'tipo' => $tipoUnidad,
                    'numero' => $numero,
                    'fila' => $fila,
                    'columna' => $columna,
                    'codigo' => CemnSepultura::generarCodigo($bloque, $fila, $columna),
                    'estado' => CemnSepultura::ESTADO_LIBRE,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
                $numero++;
            }

            if (!empty($rows)) {
                CemnSepultura::query()->insert($rows);
            }

            $bloque->sentido_numeracion = $sentido;
            $bloque->numero_inicio = $inicio;
            $bloque->save();
        });

        return response()->json(['ok' => true]);
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
            'sentido_numeracion' => 'nullable|string|in:' . implode(',', self::SENTIDOS),
            'numero_inicio' => 'nullable|integer|min:1|max:1000000',
            'descripcion' => 'nullable|string|max:2000',
            'lat' => 'nullable|numeric',
            'lon' => 'nullable|numeric',
        ]);

        $data['sentido_numeracion'] = $data['sentido_numeracion'] ?? $item->sentido_numeracion ?? 'fila_lr_tb';
        $data['numero_inicio'] = isset($data['numero_inicio']) ? (int) $data['numero_inicio'] : (int) ($item->numero_inicio ?? 1);
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

