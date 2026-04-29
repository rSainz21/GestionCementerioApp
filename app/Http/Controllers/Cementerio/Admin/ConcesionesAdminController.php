<?php

namespace App\Http\Controllers\Cementerio\Admin;

use App\Http\Controllers\Controller;
use App\Models\CemnConcesion;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ConcesionesAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $limit = (int) ($request->query('limit', 500));
        $limit = max(1, min(2000, $limit));

        $qSepulturaId = $request->query('sepultura_id');
        $sepulturaId = is_null($qSepulturaId) ? null : (int) $qSepulturaId;

        $query = CemnConcesion::query()
            ->with([
                'sepultura:id,codigo,zona_id,bloque_id,fila,columna,estado',
                'sepultura.zona:id,nombre',
                'sepultura.bloque:id,nombre,codigo',
                'terceros:id,nombre,apellido1,apellido2,dni',
            ])
            ->when($sepulturaId && $sepulturaId > 0, fn ($qq) => $qq->where('sepultura_id', $sepulturaId))
            ->orderByDesc('id')
            ->limit($limit);

        $items = $query->get()
            ->map(function (CemnConcesion $c) {
                $concesionario = $c->terceros->firstWhere('pivot.rol', 'concesionario')
                    ?? $c->terceros->first();

                return [
                    'id' => $c->id,
                    'sepultura_id' => $c->sepultura_id,
                    'sepultura_codigo' => $c->sepultura?->codigo,
                    'zona_nombre' => $c->sepultura?->zona?->nombre,
                    'bloque_nombre' => $c->sepultura?->bloque?->nombre,
                    'numero_expediente' => $c->numero_expediente,
                    'tipo' => $c->tipo,
                    'fecha_concesion' => optional($c->fecha_concesion)->toDateString(),
                    'fecha_vencimiento' => optional($c->fecha_vencimiento)->toDateString(),
                    'duracion_anos' => $c->duracion_anos,
                    'estado' => $c->estado,
                    'concesionario' => $concesionario
                        ? trim(($concesionario->nombre ?? '').' '.($concesionario->apellido1 ?? '').' '.($concesionario->apellido2 ?? ''))
                        : null,
                    'concesionario_dni' => $concesionario?->dni,
                ];
            })
            ->values();

        return response()->json(['items' => $items]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'sepultura_id' => ['required', 'integer', 'min:1', 'exists:cemn_sepulturas,id'],
            'numero_expediente' => ['nullable', 'string', 'max:30'],
            'tipo' => ['nullable', 'in:temporal,perpetua'],
            'fecha_concesion' => ['nullable', 'date'],
            'fecha_vencimiento' => ['nullable', 'date'],
            'duracion_anos' => ['nullable', 'integer', 'min:0', 'max:1000'],
            'estado' => ['nullable', 'in:vigente,caducada,renovada,transferida,anulada'],
            'importe' => ['nullable', 'numeric'],
            'moneda' => ['nullable', 'in:pesetas,euros'],
            'texto_concesion' => ['nullable', 'string'],
            'concesion_previa_id' => ['nullable', 'integer', 'min:1', 'exists:cemn_concesiones,id'],
            'notas' => ['nullable', 'string'],
        ]);

        $c = CemnConcesion::create($data);

        return response()->json([
            'item' => $c->fresh(),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $c = CemnConcesion::query()->findOrFail($id);

        $data = $request->validate([
            'sepultura_id' => ['sometimes', 'integer', 'min:1', 'exists:cemn_sepulturas,id'],
            'numero_expediente' => ['sometimes', 'nullable', 'string', 'max:30'],
            'tipo' => ['sometimes', 'nullable', 'in:temporal,perpetua'],
            'fecha_concesion' => ['sometimes', 'nullable', 'date'],
            'fecha_vencimiento' => ['sometimes', 'nullable', 'date'],
            'duracion_anos' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:1000'],
            'estado' => ['sometimes', 'nullable', 'in:vigente,caducada,renovada,transferida,anulada'],
            'importe' => ['sometimes', 'nullable', 'numeric'],
            'moneda' => ['sometimes', 'nullable', 'in:pesetas,euros'],
            'texto_concesion' => ['sometimes', 'nullable', 'string'],
            'concesion_previa_id' => ['sometimes', 'nullable', 'integer', 'min:1', 'exists:cemn_concesiones,id'],
            'notas' => ['sometimes', 'nullable', 'string'],
        ]);

        $c->fill($data)->save();

        return response()->json([
            'item' => $c->fresh(),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $c = CemnConcesion::query()->findOrFail($id);
        $c->delete();
        return response()->json(['ok' => true]);
    }
}

