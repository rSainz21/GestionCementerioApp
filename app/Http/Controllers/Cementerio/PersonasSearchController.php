<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnPersona;
use App\Models\CemnSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PersonasSearchController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q    = trim((string) $request->query('q', ''));
        $tipo = trim((string) $request->query('tipo', ''));

        if (mb_strlen($q) < 2) {
            return response()->json(['items' => []]);
        }

        $query = CemnPersona::query()->buscar($q);

        if ($tipo === 'titular') {
            $query->titulares();
        } elseif ($tipo === 'difunto') {
            $query->difuntos();
        }

        $lim = CemnSetting::intRange('busqueda_inline_limite', 15, 5, 50);

        $items = $query
            ->with([
                'sepultura:id,codigo,zona_id,bloque_id',
                'sepultura.zona:id,nombre',
                'sepultura.bloque:id,nombre,codigo',
            ])
            ->orderBy('apellido1')
            ->orderBy('nombre_completo')
            ->limit($lim)
            ->get()
            ->map(function (CemnPersona $p) {
                $ubicacion = $p->sepultura ? trim(implode(' · ', array_filter([
                    $p->sepultura->codigo ? ('Unidad ' . $p->sepultura->codigo) : null,
                    $p->sepultura->bloque?->nombre ? ('Bloque ' . $p->sepultura->bloque->nombre) : null,
                    $p->sepultura->zona?->nombre  ? ('Zona '   . $p->sepultura->zona->nombre)   : null,
                ]))) : null;

                return [
                    'id'                  => $p->id,
                    'tipo'                => $p->tipo,
                    'nombre_display'      => $p->nombre_display,
                    'nombre_completo'     => $p->nombre_completo,
                    'nombre'              => $p->nombre,
                    'apellido1'           => $p->apellido1,
                    'apellido2'           => $p->apellido2,
                    'nombre_original'     => $p->nombre_original,
                    'dni'                 => $p->dni,
                    'cif'                 => $p->cif,
                    'es_empresa'          => (bool) $p->es_empresa,
                    'razon_social'        => $p->razon_social,
                    'telefono'            => $p->telefono,
                    'email'               => $p->email,
                    'direccion'           => $p->direccion,
                    'sepultura_id'        => $p->sepultura_id,
                    'sepultura_codigo'    => $p->sepultura?->codigo,
                    'bloque_nombre'       => $p->sepultura?->bloque?->nombre,
                    'zona_nombre'         => $p->sepultura?->zona?->nombre,
                    'fecha_fallecimiento' => optional($p->fecha_fallecimiento)->toDateString(),
                    'fecha_inhumacion'    => optional($p->fecha_inhumacion)->toDateString(),
                    'label'               => trim(implode(' — ', array_filter([
                        $p->nombre_display . ($p->dni ? ' (' . $p->dni . ')' : ''),
                        $ubicacion ?: null,
                    ]))),
                ];
            })
            ->values();

        return response()->json(['items' => $items]);
    }
}
