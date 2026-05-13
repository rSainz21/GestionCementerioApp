<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnConcesion;
use App\Models\CemnPersona;
use App\Models\CemnSepultura;
use App\Models\CemnSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BuscadorGlobalController extends Controller
{
    public function search(Request $request): JsonResponse
    {
        $q = trim($request->get('q', ''));
        $minChars = CemnSetting::intRange('busqueda_global_min_caracteres', 2, 1, 6);
        if (strlen($q) < $minChars) {
            return response()->json(['grupos' => [], 'total' => 0]);
        }

        $like = '%' . $q . '%';
        $limGrupos   = CemnSetting::intRange('busqueda_global_limite_grupos', 8, 3, 30);
        $limTerceros = CemnSetting::intRange('busqueda_global_limite_terceros', 6, 2, 25);

        // ── Difuntos ──────────────────────────────────────────────────────
        $difuntos = CemnPersona::query()
            ->difuntos()
            ->buscar($q)
            ->with('sepultura:id,codigo')
            ->limit($limGrupos)
            ->get()
            ->map(fn ($d) => [
                'id'               => $d->id,
                'tipo'             => 'difunto',
                'titulo'           => $d->nombre_display,
                'subtitulo'        => implode(' · ', array_filter([
                    $d->dni,
                    $d->fecha_fallecimiento?->format('d/m/Y') ? '† ' . $d->fecha_fallecimiento->format('d/m/Y') : null,
                    $d->sepultura?->codigo,
                ])),
                'sepultura_id'     => $d->sepultura_id,
                'sepultura_codigo' => $d->sepultura?->codigo,
            ]);

        // ── Concesiones ───────────────────────────────────────────────────
        $concesiones = CemnConcesion::query()
            ->where(fn ($w) => $w
                ->where('numero_expediente', 'LIKE', $like)
                ->orWhereHas('personas', fn ($q2) => $q2
                    ->whereRaw("CONCAT(COALESCE(nombre,''), ' ', COALESCE(apellido1,''), ' ', COALESCE(apellido2,'')) LIKE ?", [$like])
                    ->orWhere('nombre_completo', 'LIKE', $like)
                    ->orWhere('razon_social', 'LIKE', $like)
                    ->orWhere('dni', 'LIKE', $like)
                )
            )
            ->with([
                'sepultura:id,codigo',
                'concesionario.persona',
            ])
            ->limit($limGrupos)
            ->get()
            ->map(fn ($c) => [
                'id'                => $c->id,
                'tipo'              => 'concesion',
                'titulo'            => $c->numero_expediente ?? "Concesión #{$c->id}",
                'subtitulo'         => implode(' · ', array_filter([
                    $this->nombreConcesionario($c),
                    $c->estado ? ucfirst($c->estado) : null,
                    $c->sepultura?->codigo,
                ])),
                'sepultura_id'      => $c->sepultura_id,
                'sepultura_codigo'  => $c->sepultura?->codigo,
                'estado'            => $c->estado,
            ]);

        // ── Sepulturas ────────────────────────────────────────────────────
        $sepulturas = CemnSepultura::query()
            ->where(fn ($w) => $w
                ->where('codigo', 'LIKE', $like)
                ->orWhere('ubicacion_texto', 'LIKE', $like)
                ->orWhere('notas', 'LIKE', $like)
            )
            ->with(['zona:id,nombre', 'bloque:id,nombre'])
            ->limit($limGrupos)
            ->get()
            ->map(fn ($s) => [
                'id'       => $s->id,
                'tipo'     => 'sepultura',
                'titulo'   => $s->codigo,
                'subtitulo' => implode(' · ', array_filter([
                    $s->zona?->nombre,
                    $s->bloque?->nombre,
                    ucfirst($s->estado),
                ])),
                'sepultura_id' => $s->id,
                'estado'       => $s->estado,
            ]);

        // ── Titulares ─────────────────────────────────────────────────────
        $terceros = CemnPersona::query()
            ->titulares()
            ->buscar($q)
            ->withCount('concesiones')
            ->limit($limTerceros)
            ->get()
            ->map(fn ($t) => [
                'id'         => $t->id,
                'tipo'       => 'tercero',
                'titulo'     => $t->nombre_display,
                'subtitulo'  => implode(' · ', array_filter([
                    $t->dni ?? $t->cif,
                    $t->concesiones_count > 0 ? "{$t->concesiones_count} concesión(es)" : null,
                ])),
                'es_empresa' => $t->es_empresa,
            ]);

        $grupos = [];
        if ($sepulturas->isNotEmpty()) {
            $grupos[] = ['tipo' => 'sepultura', 'label' => 'Sepulturas', 'icono' => 'pi-home', 'items' => $sepulturas];
        }
        if ($difuntos->isNotEmpty()) {
            $grupos[] = ['tipo' => 'difunto', 'label' => 'Difuntos', 'icono' => 'pi-user', 'items' => $difuntos];
        }
        if ($concesiones->isNotEmpty()) {
            $grupos[] = ['tipo' => 'concesion', 'label' => 'Concesiones', 'icono' => 'pi-file', 'items' => $concesiones];
        }
        if ($terceros->isNotEmpty()) {
            $grupos[] = ['tipo' => 'tercero', 'label' => 'Terceros / Titulares', 'icono' => 'pi-users', 'items' => $terceros];
        }

        $total = $difuntos->count() + $concesiones->count() + $sepulturas->count() + $terceros->count();

        return response()->json(['grupos' => $grupos, 'total' => $total, 'q' => $q]);
    }

    private function nombreConcesionario(CemnConcesion $c): ?string
    {
        $persona = $c->concesionario?->persona;
        if (!$persona) return null;
        return $persona->nombre_display;
    }
}
