<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnConcesion;
use App\Models\CemnConcesionPersona;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ConcesionRenovarController extends Controller
{
    public function renovar(Request $request, int $id): JsonResponse
    {
        $vieja = CemnConcesion::findOrFail($id);

        $data = $request->validate([
            'duracion_anos'     => 'required|integer|min:0',
            'fecha_inicio'      => 'nullable|date',
            'importe'           => 'nullable|numeric|min:0',
            'numero_expediente' => 'nullable|string|max:100',
            'notas'             => 'nullable|string|max:2000',
        ]);

        $inicio = Carbon::parse($data['fecha_inicio'] ?? now())->startOfDay();
        $duracion = (int) $data['duracion_anos'];
        $vencimiento = $duracion > 0 ? $inicio->copy()->addYears($duracion) : null;
        $tipo = $duracion === 0 ? 'perpetua' : 'temporal';

        DB::transaction(function () use ($vieja, $data, $inicio, $vencimiento, $tipo, $duracion) {
            // Marcar la concesión anterior como renovada
            $vieja->update(['estado' => 'renovada']);

            // Crear la nueva concesión
            $nueva = CemnConcesion::create([
                'sepultura_id'       => $vieja->sepultura_id,
                'concesion_previa_id'=> $vieja->id,
                'tipo'               => $tipo,
                'estado'             => 'vigente',
                'fecha_concesion'    => $inicio,
                'fecha_vencimiento'  => $vencimiento,
                'duracion_anos'      => $duracion > 0 ? $duracion : null,
                'importe'            => $data['importe'] ?? null,
                'moneda'             => $vieja->moneda ?? 'EUR',
                'numero_expediente'  => $data['numero_expediente'] ?? null,
                'texto_concesion'    => $vieja->texto_concesion,
                'notas'              => $data['notas'] ?? null,
            ]);

            // Copiar los concesionarios a la nueva concesión
            foreach ($vieja->concesionPersonas as $ct) {
                CemnConcesionPersona::create([
                    'concesion_id' => $nueva->id,
                    'persona_id'   => $ct->persona_id,
                    'rol'          => $ct->rol,
                    'activo'       => $ct->activo,
                    'fecha_desde'  => $inicio,
                    'notas'        => $ct->notas,
                ]);
            }
        });

        return response()->json([
            'ok'      => true,
            'message' => 'Concesión renovada correctamente.',
        ]);
    }

    public function historial(int $id): JsonResponse
    {
        $concesion = CemnConcesion::with([
            'concesionPrevia',
            'concesionesDerivadas',
        ])->findOrFail($id);

        $chain = [];

        // Subir hasta el origen de la cadena
        $cursor = $concesion;
        while ($cursor->concesion_previa_id) {
            $cursor = CemnConcesion::find($cursor->concesion_previa_id);
            if (!$cursor) break;
            array_unshift($chain, $this->mapItem($cursor, 'previa'));
        }

        // La concesión actual
        $chain[] = $this->mapItem($concesion, 'actual');

        // Renovaciones posteriores si las hay
        foreach ($concesion->concesionesDerivadas as $derivada) {
            $chain[] = $this->mapItem($derivada, 'derivada');
        }

        return response()->json(['historial' => $chain]);
    }

    private function mapItem(CemnConcesion $c, string $rol): array
    {
        return [
            'id'                => $c->id,
            'rol'               => $rol,
            'estado'            => $c->estado,
            'tipo'              => $c->tipo,
            'numero_expediente' => $c->numero_expediente,
            'fecha_concesion'   => $c->fecha_concesion?->format('d/m/Y'),
            'fecha_vencimiento' => $c->fecha_vencimiento?->format('d/m/Y'),
            'duracion_anos'     => $c->duracion_anos,
            'importe'           => $c->importe,
            'notas'             => $c->notas,
        ];
    }
}
