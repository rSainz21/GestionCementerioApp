<?php

namespace App\Http\Controllers\Cementerio\Admin;

use App\Http\Controllers\Controller;
use App\Models\CemnPersona;
use App\Models\CemnSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PersonasAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q    = trim((string) $request->query('q', ''));
        $tipo = trim((string) $request->query('tipo', ''));

        $query = CemnPersona::query()->withCount('concesiones');

        if ($tipo === 'titular') {
            $query->titulares();
        } elseif ($tipo === 'difunto') {
            $query->difuntos();
        }

        if ($q !== '') {
            $query->buscar($q);
        }

        $lim = CemnSetting::intRange('admin_listado_busqueda_limite', 500, 100, 2000);

        $items = $query
            ->orderBy('nombre_original')
            ->orderBy('nombre_completo')
            ->limit($lim)
            ->get()
            ->map(fn (CemnPersona $p) => [
                'id'                => $p->id,
                'tipo'              => $p->tipo,
                'nombre_display'    => $p->nombre_display,
                'nombre_original'   => $p->nombre_original,
                'nombre_completo'   => $p->nombre_completo,
                'nombre'            => $p->nombre,
                'apellido1'         => $p->apellido1,
                'apellido2'         => $p->apellido2,
                'dni'               => $p->dni,
                'es_empresa'        => (bool) $p->es_empresa,
                'cif'               => $p->cif,
                'razon_social'      => $p->razon_social,
                'telefono'          => $p->telefono,
                'email'             => $p->email,
                'sepultura_id'      => $p->sepultura_id,
                'es_principal'      => (bool) $p->es_principal,
                'parentesco'        => $p->parentesco,
                'estado_inhumacion' => $p->estado_inhumacion,
                'fecha_fallecimiento' => optional($p->fecha_fallecimiento)->toDateString(),
                'fecha_inhumacion'  => optional($p->fecha_inhumacion)->toDateString(),
                'notas'             => $p->notas,
                'concesiones_count' => $p->concesiones_count,
            ])
            ->values();

        return response()->json(['items' => $items]);
    }
}
