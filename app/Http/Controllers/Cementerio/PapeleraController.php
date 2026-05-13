<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnConcesion;
use App\Models\CemnPersona;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PapeleraController extends Controller
{
    private static array $tipos = ['personas', 'concesiones'];

    public function index(): JsonResponse
    {
        $personas = CemnPersona::onlyTrashed()
            ->with(['sepultura:id,codigo'])
            ->orderByDesc('deleted_at')
            ->get()
            ->map(fn ($p) => [
                'id'           => $p->id,
                'tipo'         => 'personas',
                'subtipo'      => $p->tipo,
                'titulo'       => $p->nombre_display,
                'subtitulo'    => implode(' · ', array_filter([
                    $p->dni ?? $p->cif,
                    $p->fecha_fallecimiento ? ('† '.$p->fecha_fallecimiento->toDateString()) : null,
                    $p->sepultura?->codigo ? ('Unidad '.$p->sepultura->codigo) : null,
                ])),
                'eliminado_en' => $p->deleted_at->format('d/m/Y H:i'),
            ]);

        $concesiones = CemnConcesion::onlyTrashed()
            ->with(['sepultura:id,codigo'])
            ->orderByDesc('deleted_at')
            ->get()
            ->map(fn ($c) => [
                'id'           => $c->id,
                'tipo'         => 'concesiones',
                'titulo'       => $c->numero_expediente ? "Exp. {$c->numero_expediente}" : "Concesión #{$c->id}",
                'subtitulo'    => implode(' · ', array_filter([
                    $c->tipo,
                    $c->estado,
                    $c->sepultura?->codigo ? ('Unidad '.$c->sepultura->codigo) : null,
                ])),
                'eliminado_en' => $c->deleted_at->format('d/m/Y H:i'),
            ]);

        return response()->json([
            'personas'    => $personas,
            'concesiones' => $concesiones,
            'total'       => $personas->count() + $concesiones->count(),
        ]);
    }

    public function restore(string $tipo, int $id): JsonResponse
    {
        abort_unless(in_array($tipo, self::$tipos), 404);

        $model = $this->resolveModel($tipo);
        $registro = $model::onlyTrashed()->findOrFail($id);
        $registro->restore();

        return response()->json(['ok' => true, 'message' => 'Registro restaurado correctamente.']);
    }

    public function forceDelete(string $tipo, int $id): JsonResponse
    {
        abort_unless(in_array($tipo, self::$tipos), 404);

        $model = $this->resolveModel($tipo);
        $registro = $model::onlyTrashed()->findOrFail($id);
        $registro->forceDelete();

        return response()->json(['ok' => true, 'message' => 'Registro eliminado definitivamente.']);
    }

    public function vaciar(): JsonResponse
    {
        CemnPersona::onlyTrashed()->forceDelete();
        CemnConcesion::onlyTrashed()->forceDelete();

        return response()->json(['ok' => true, 'message' => 'Papelera vaciada.']);
    }

    private function resolveModel(string $tipo): string
    {
        return match ($tipo) {
            'personas'    => CemnPersona::class,
            'concesiones' => CemnConcesion::class,
        };
    }
}
