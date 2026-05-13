<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnPersona;
use App\Models\CemnMovimiento;
use App\Models\CemnSepultura;
use App\Models\CemnSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class WorkflowExhumacionController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $sanKb = CemnSetting::intRange('documento_sanidad_max_kb', 10240, 512, 51200);

        $data = $request->validate([
            'sepultura_id'        => ['required', 'integer', 'exists:cemn_sepulturas,id'],
            'persona_id'          => ['required', 'integer', 'exists:cemn_personas,id'],
            'tipo'                => ['required', 'string', Rule::in(['exhumacion', 'traslado'])],
            'fecha'               => ['nullable', 'date'],
            'notas'               => ['nullable', 'string'],
            'motivo_exhumacion'   => ['nullable', 'string', 'max:2000'],
            'estado_resultado'    => ['nullable', 'string', Rule::in(['restos', 'exhumado'])],
            'sepultura_destino_id'=> ['nullable', 'integer', 'exists:cemn_sepulturas,id'],
            'documento_sanidad'   => [
                Rule::requiredIf(fn () => $request->input('tipo') === 'exhumacion'),
                'nullable',
                'file',
                'mimes:pdf,jpg,jpeg,png',
                'max:'.$sanKb,
            ],
        ]);

        // Guardar documento de sanidad si se adjuntó
        $docPath = null;
        if ($request->hasFile('documento_sanidad')) {
            $docPath = $request->file('documento_sanidad')
                ->store('cementerio/sanidad', 'public');
        }

        $out = DB::transaction(function () use ($data, $docPath) {
            /** @var CemnSepultura $sepultura */
            $sepultura = CemnSepultura::query()
                ->lockForUpdate()
                ->findOrFail($data['sepultura_id']);

            /** @var CemnPersona $difunto */
            $difunto = CemnPersona::query()
                ->lockForUpdate()
                ->findOrFail($data['persona_id']);

            if ((int) $difunto->sepultura_id !== (int) $sepultura->id) {
                abort(422, 'La persona indicada no está vinculada a esta sepultura.');
            }

            $fechaExhumacion = $data['fecha'] ? Carbon::parse($data['fecha']) : now();

            // Registrar el movimiento
            $mov = CemnMovimiento::query()->create([
                'persona_id'          => $difunto->id,
                'tipo'                => $data['tipo'],
                'fecha'               => $fechaExhumacion,
                'sepultura_origen_id' => $sepultura->id,
                'sepultura_destino_id'=> $data['sepultura_destino_id'] ?? null,
                'notas'               => $data['notas'] ?? null,
            ]);

            // Determinar estado final del difunto
            $estadoResultado = $data['estado_resultado'] ?? 'exhumado';

            // Actualizar difunto
            $difunto->estado_inhumacion  = $estadoResultado;
            $difunto->fecha_exhumacion   = $fechaExhumacion;
            $difunto->motivo_exhumacion  = $data['motivo_exhumacion'] ?? null;
            if ($docPath) {
                $difunto->documento_sanidad_path = $docPath;
            }

            if ($estadoResultado === 'restos') {
                // Permanece en el nicho como restos: sepultura_id NO cambia
            } else {
                // 'exhumado': se extrae completamente del nicho
                $difunto->sepultura_id = null;
            }
            $difunto->save();

            // Liberar sepultura solo si no quedan difuntos activamente inhumados
            // (los restos no bloquean el nicho para nuevas inhumaciones)
            $inhumadosRestantes = CemnPersona::query()
                ->where('sepultura_id', $sepultura->id)
                ->where('estado_inhumacion', 'inhumado')
                ->count();

            if ($inhumadosRestantes === 0) {
                $sepultura->estado = CemnSepultura::ESTADO_LIBRE;
                $sepultura->save();
            }

            return [$mov->id, $inhumadosRestantes];
        });

        return response()->json([
            'ok'            => true,
            'movimiento_id' => $out[0],
            'restantes'     => $out[1],
        ]);
    }
}
