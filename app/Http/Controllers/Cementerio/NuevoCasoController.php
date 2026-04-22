<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnBloque;
use App\Models\CemnConcesion;
use App\Models\CemnConcesionTercero;
use App\Models\CemnDifunto;
use App\Models\CemnSepultura;
use App\Models\CemnTercero;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class NuevoCasoController extends Controller
{
    /**
     * Crea un nuevo caso (titular + difunto + concesión) de forma transaccional
     * y marca la sepultura como ocupada.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            // Titular (tercero)
            'titular.id' => ['nullable', 'integer', 'exists:cemn_terceros,id'],
            'titular.dni' => ['nullable', 'string', 'max:15'],
            'titular.nombre' => ['required_without:titular.id', 'nullable', 'string', 'max:60'],
            'titular.apellido1' => ['nullable', 'string', 'max:60'],
            'titular.apellido2' => ['nullable', 'string', 'max:60'],
            'titular.telefono' => ['nullable', 'string', 'max:20'],
            'titular.email' => ['nullable', 'string', 'max:120'],
            'titular.direccion' => ['nullable', 'string', 'max:255'],
            'titular.municipio' => ['nullable', 'string', 'max:80'],
            'titular.provincia' => ['nullable', 'string', 'max:80'],
            'titular.cp' => ['nullable', 'string', 'max:10'],

            // Difunto
            'difunto.nombre_completo' => ['required', 'string', 'max:200'],
            'difunto.fecha_fallecimiento' => ['nullable', 'date'],
            'difunto.fecha_inhumacion' => ['nullable', 'date'],
            'difunto.parentesco' => ['nullable', 'string', 'max:60'],
            'difunto.notas' => ['nullable', 'string'],
            'difunto.foto' => ['nullable', 'file', 'image', 'max:5120'], // 5MB

            // Selección de unidad
            'sepultura_id' => ['required', 'integer', 'exists:cemn_sepulturas,id'],

            // Concesión
            'concesion.numero_expediente' => ['nullable', 'string', 'max:30'],
            'concesion.tipo' => ['required', Rule::in(['temporal', 'perpetua'])],
            'concesion.fecha_concesion' => ['nullable', 'date'],
            'concesion.fecha_vencimiento' => ['nullable', 'date'],
            'concesion.duracion_anos' => ['nullable', 'integer', 'min:1'],
            'concesion.importe' => ['nullable', 'numeric', 'min:0'],
            'concesion.moneda' => ['nullable', Rule::in(['euros', 'pesetas'])],
            'concesion.texto_concesion' => ['nullable', 'string'],
            'concesion.notas' => ['nullable', 'string'],
        ]);

        $fotoFile = $request->file('difunto.foto');

        $result = DB::transaction(function () use ($data, $fotoFile) {
            // Bloquea la sepultura para evitar carreras en asignación
            /** @var CemnSepultura $sepultura */
            $sepultura = CemnSepultura::query()
                ->lockForUpdate()
                ->findOrFail($data['sepultura_id']);

            if ($sepultura->estado !== CemnSepultura::ESTADO_LIBRE) {
                abort(422, 'La unidad seleccionada no está libre.');
            }

            // Titular: existente o nuevo
            $titularId = data_get($data, 'titular.id');
            if ($titularId) {
                /** @var CemnTercero $titular */
                $titular = CemnTercero::query()->findOrFail($titularId);
            } else {
                $titular = CemnTercero::create([
                    'dni' => data_get($data, 'titular.dni'),
                    'nombre' => data_get($data, 'titular.nombre'),
                    'apellido1' => data_get($data, 'titular.apellido1'),
                    'apellido2' => data_get($data, 'titular.apellido2'),
                    'telefono' => data_get($data, 'titular.telefono'),
                    'email' => data_get($data, 'titular.email'),
                    'direccion' => data_get($data, 'titular.direccion'),
                    'municipio' => data_get($data, 'titular.municipio'),
                    'provincia' => data_get($data, 'titular.provincia'),
                    'cp' => data_get($data, 'titular.cp'),
                    'es_empresa' => false,
                ]);
            }

            // Concesión
            $concesion = CemnConcesion::create([
                'sepultura_id' => $sepultura->id,
                'numero_expediente' => data_get($data, 'concesion.numero_expediente'),
                'tipo' => data_get($data, 'concesion.tipo', 'temporal'),
                'fecha_concesion' => data_get($data, 'concesion.fecha_concesion'),
                'fecha_vencimiento' => data_get($data, 'concesion.fecha_vencimiento'),
                'duracion_anos' => data_get($data, 'concesion.duracion_anos'),
                'estado' => 'vigente',
                'importe' => data_get($data, 'concesion.importe'),
                'moneda' => data_get($data, 'concesion.moneda', 'euros'),
                'texto_concesion' => data_get($data, 'concesion.texto_concesion'),
                'notas' => data_get($data, 'concesion.notas'),
            ]);

            // Relación concesionario (pivot)
            CemnConcesionTercero::create([
                'concesion_id' => $concesion->id,
                'tercero_id' => $titular->id,
                'rol' => 'concesionario',
                'fecha_desde' => data_get($data, 'concesion.fecha_concesion'),
                'fecha_hasta' => data_get($data, 'concesion.fecha_vencimiento'),
                'activo' => true,
            ]);

            // Difunto (asignado físicamente a la sepultura)
            $difunto = CemnDifunto::create([
                'tercero_id' => null,
                'nombre_completo' => data_get($data, 'difunto.nombre_completo'),
                'fecha_fallecimiento' => data_get($data, 'difunto.fecha_fallecimiento'),
                'fecha_inhumacion' => data_get($data, 'difunto.fecha_inhumacion'),
                'sepultura_id' => $sepultura->id,
                'es_titular' => true,
                'parentesco' => data_get($data, 'difunto.parentesco'),
                'notas' => data_get($data, 'difunto.notas'),
            ]);

            if ($fotoFile) {
                $ext = strtolower($fotoFile->getClientOriginalExtension() ?: 'jpg');
                $filename = Str::uuid()->toString().'.'.$ext;
                $dir = 'cementerio/difuntos/'.$difunto->id;
                $path = $fotoFile->storePubliclyAs($dir, $filename, 'public');
                $difunto->foto_path = $path;
                $difunto->save();
            }

            // Marcar como ocupada
            $sepultura->estado = CemnSepultura::ESTADO_OCUPADA;
            $sepultura->save();

            return [
                'titular' => $titular,
                'concesion' => $concesion,
                'difunto' => $difunto,
                'sepultura' => $sepultura->fresh(['bloque', 'zona']),
            ];
        });

        return response()->json([
            'message' => 'Caso creado correctamente.',
            'data' => $result,
        ], 201);
    }
}

