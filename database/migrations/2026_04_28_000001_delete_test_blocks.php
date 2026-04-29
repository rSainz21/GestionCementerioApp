<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Bloques de prueba creados durante las sesiones de desarrollo.
        // Los bloques reales tienen códigos que siguen el patrón ZV-B* o B1/B2/B3.
        // Eliminamos los que tienen nombres claramente de prueba y no tienen
        // sepulturas con concesiones ni difuntos reales.

        $testPatterns = [
            'Pedro', 'gitanico', 'PRUEBAS', 'fffff', 'direccion',
            'Uriel', 'Pedrogita', 'PedroMonster', 'prueva', 'Pedromoster',
            'pedro-moster', 'Pedromóster',
        ];

        // Construir condición LIKE para cada patrón
        $query = DB::table('cemn_bloques');
        foreach ($testPatterns as $i => $pattern) {
            if ($i === 0) {
                $query->where('nombre', 'like', "%{$pattern}%");
            } else {
                $query->orWhere('nombre', 'like', "%{$pattern}%");
            }
        }

        $testBloqueIds = $query->pluck('id')->toArray();

        if (empty($testBloqueIds)) {
            return;
        }

        // Obtener sepulturas de estos bloques
        $testSepulturaIds = DB::table('cemn_sepulturas')
            ->whereIn('bloque_id', $testBloqueIds)
            ->pluck('id')
            ->toArray();

        if (!empty($testSepulturaIds)) {
            // Eliminamos sólo sepulturas que no tienen concesiones ni difuntos
            // (las de prueba no deberían tenerlos, pero lo comprobamos)
            $sepConDatos = DB::table('cemn_concesiones')
                ->whereIn('sepultura_id', $testSepulturaIds)
                ->pluck('sepultura_id')
                ->merge(
                    DB::table('cemn_difuntos')
                        ->whereIn('sepultura_id', $testSepulturaIds)
                        ->pluck('sepultura_id')
                )
                ->unique()
                ->toArray();

            $sepAEliminar = array_diff($testSepulturaIds, $sepConDatos);

            if (!empty($sepAEliminar)) {
                DB::table('cemn_sepulturas')->whereIn('id', $sepAEliminar)->delete();
            }
        }

        // Eliminar los bloques de prueba que ya no tienen sepulturas
        $bloquesAEliminar = DB::table('cemn_bloques')
            ->whereIn('id', $testBloqueIds)
            ->whereNotExists(function ($q) {
                $q->from('cemn_sepulturas')->whereColumn('bloque_id', 'cemn_bloques.id');
            })
            ->pluck('id')
            ->toArray();

        if (!empty($bloquesAEliminar)) {
            DB::table('cemn_bloques')->whereIn('id', $bloquesAEliminar)->delete();
        }
    }

    public function down(): void
    {
        // No reversible: borrado de datos de prueba
    }
};
