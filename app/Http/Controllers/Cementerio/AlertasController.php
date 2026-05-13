<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnConcesion;
use App\Models\CemnPersona;
use App\Models\CemnSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;

class AlertasController extends Controller
{
    public function index(): JsonResponse
    {
        $diasAviso    = (int) CemnSetting::get('dias_aviso_vencimiento', 90);
        $diasUrgencia = (int) CemnSetting::get('dias_urgencia', 30);
        $perGrupo     = CemnSetting::intRange('alertas_items_por_grupo', 6, 3, 25);

        $hoy      = Carbon::today();
        $enAviso  = Carbon::today()->addDays($diasAviso);
        $enUrgente = Carbon::today()->addDays($diasUrgencia);

        // ── 1. Concesiones caducadas ────────────────────────────────────────
        $caducadasBase = CemnConcesion::where('estado', 'caducada')
            ->with(['sepultura:id,codigo', 'concesionario.tercero:id,nombre,apellido1,apellido2']);

        $totalCaducadas = $caducadasBase->count();

        $itemsCaducadas = CemnConcesion::where('estado', 'caducada')
            ->with(['sepultura:id,codigo', 'concesionario.tercero:id,nombre,apellido1,apellido2'])
            ->orderBy('fecha_vencimiento')
            ->limit($perGrupo)
            ->get()
            ->map(fn ($c) => [
                'id'                => $c->id,
                'sepultura_codigo'  => $c->sepultura?->codigo,
                'sepultura_id'      => $c->sepultura_id,
                'numero_expediente' => $c->numero_expediente,
                'fecha_vencimiento' => $c->fecha_vencimiento?->format('d/m/Y'),
                'concesionario'     => $this->nombreConcesionario($c),
            ]);

        // ── 2. Concesiones próximas a vencer (≤ 90 días) ───────────────────
        $totalProximas = CemnConcesion::where('estado', 'vigente')
            ->whereNotNull('fecha_vencimiento')
            ->whereBetween('fecha_vencimiento', [$hoy->toDateString(), $enAviso->toDateString()])
            ->count();

        $itemsProximas = CemnConcesion::where('estado', 'vigente')
            ->whereNotNull('fecha_vencimiento')
            ->whereBetween('fecha_vencimiento', [$hoy->toDateString(), $enAviso->toDateString()])
            ->with(['sepultura:id,codigo', 'concesionario.tercero:id,nombre,apellido1,apellido2'])
            ->orderBy('fecha_vencimiento')
            ->limit($perGrupo)
            ->get()
            ->map(fn ($c) => [
                'id'                => $c->id,
                'sepultura_codigo'  => $c->sepultura?->codigo,
                'sepultura_id'      => $c->sepultura_id,
                'numero_expediente' => $c->numero_expediente,
                'fecha_vencimiento' => $c->fecha_vencimiento?->format('d/m/Y'),
                'dias_restantes'    => (int) $hoy->diffInDays($c->fecha_vencimiento, false),
                'urgente'           => $c->fecha_vencimiento?->lte($enUrgente),
                'concesionario'     => $this->nombreConcesionario($c),
            ]);

        // ── 3. Difuntos sin sepultura asignada ─────────────────────────────
        $totalSinUbicar = CemnPersona::sinSepultura()->count();

        $itemsSinUbicar = CemnPersona::sinSepultura()
            ->orderByDesc('created_at')
            ->limit($perGrupo)
            ->get()
            ->map(fn ($d) => [
                'id'                  => $d->id,
                'nombre_completo'     => $d->nombre_display,
                'fecha_fallecimiento' => $d->fecha_fallecimiento?->format('d/m/Y'),
            ]);

        // ── 4. Concesiones sin sepultura asignada ──────────────────────────
        $totalConcesionesSinAsignar = CemnConcesion::whereNull('sepultura_id')->count();

        $itemsConcesionesSinAsignar = CemnConcesion::whereNull('sepultura_id')
            ->with(['concesionario.tercero:id,nombre,apellido1,apellido2'])
            ->orderByDesc('created_at')
            ->limit($perGrupo)
            ->get()
            ->map(fn ($c) => [
                'id'                => $c->id,
                'sepultura_codigo'  => null,
                'sepultura_id'      => null,
                'numero_expediente' => $c->numero_expediente,
                'concesionario'     => $this->nombreConcesionario($c),
            ]);

        // ── Grupos ─────────────────────────────────────────────────────────
        $grupos = [];

        if ($totalCaducadas > 0) {
            $grupos[] = [
                'clave'       => 'caducadas',
                'nivel'       => 'critico',
                'titulo'      => 'Concesiones caducadas',
                'icono'       => 'pi-times-circle',
                'total'       => $totalCaducadas,
                'items'       => $itemsCaducadas,
            ];
        }

        if ($totalProximas > 0) {
            $grupos[] = [
                'clave'       => 'proximas',
                'nivel'       => 'aviso',
                'titulo'      => "Vencen en {$diasAviso} días",
                'icono'       => 'pi-clock',
                'total'       => $totalProximas,
                'items'       => $itemsProximas,
            ];
        }

        if ($totalSinUbicar > 0) {
            $grupos[] = [
                'clave'       => 'sin_ubicar',
                'nivel'       => 'info',
                'titulo'      => 'Difuntos sin ubicar',
                'icono'       => 'pi-map-marker',
                'total'       => $totalSinUbicar,
                'items'       => $itemsSinUbicar,
            ];
        }

        if ($totalConcesionesSinAsignar > 0) {
            $grupos[] = [
                'clave'       => 'concesiones_sin_asignar',
                'nivel'       => 'aviso',
                'titulo'      => 'Concesiones sin nicho',
                'icono'       => 'pi-file-edit',
                'total'       => $totalConcesionesSinAsignar,
                'items'       => $itemsConcesionesSinAsignar,
            ];
        }

        $totalGeneral = $totalCaducadas + $totalProximas + $totalSinUbicar + $totalConcesionesSinAsignar;

        return response()->json([
            'total'         => $totalGeneral,
            'grupos'        => $grupos,
            'dias_aviso'    => $diasAviso,
            'dias_urgencia' => $diasUrgencia,
        ]);
    }

    private function nombreConcesionario(CemnConcesion $c): ?string
    {
        $persona = $c->concesionario?->persona;
        return $persona?->nombre_display;
    }
}
