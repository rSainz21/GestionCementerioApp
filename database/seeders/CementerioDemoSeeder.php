<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Crea un segundo cementerio de demostración (Bárcena de Pie de Concha)
 * con zonas, bloques y sepulturas para probar el selector multi-cementerio.
 *
 * Ejecutar: php artisan db:seed --class=CementerioDemoSeeder --force
 */
class CementerioDemoSeeder extends Seeder
{
    public function run(): void
    {
        // ── Cementerio ───────────────────────────────────────────────────────
        $cemId = DB::table('cemn_cementerios')->insertGetId([
            'nombre'    => 'Cementerio Municipal de Bárcena de Pie de Concha',
            'municipio' => 'Bárcena de Pie de Concha',
            'direccion' => 'Calle Real, s/n, 39451 Bárcena de Pie de Concha',
            'lat'       => 43.0721,
            'lon'       => -4.0283,
            'notas'     => 'Cementerio de demo para pruebas del sistema multi-cementerio',
            'created_at'=> now(),
            'updated_at'=> now(),
        ]);

        // ── Zonas ────────────────────────────────────────────────────────────
        $zonaViejaId = DB::table('cemn_zonas')->insertGetId([
            'cementerio_id' => $cemId,
            'codigo'        => 'ZA',
            'nombre'        => 'Zona Antigua',
            'descripcion'   => 'Nichos históricos siglo XX',
            'lat'           => 43.0720,
            'lon'           => -4.0282,
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);

        $zonaNewId = DB::table('cemn_zonas')->insertGetId([
            'cementerio_id' => $cemId,
            'codigo'        => 'ZB',
            'nombre'        => 'Zona Norte (Ampliación)',
            'descripcion'   => 'Ampliación moderna, nichos nuevos',
            'lat'           => 43.0724,
            'lon'           => -4.0280,
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);

        // ── Bloques y sepulturas zona antigua ───────────────────────────────
        $this->crearBloque($zonaViejaId, 'BRC-A1', 'Muro Oeste', 'nicho', 4, 8);
        $this->crearBloque($zonaViejaId, 'BRC-A2', 'Muro Este',  'nicho', 4, 6);

        // ── Bloques y sepulturas zona ampliación ────────────────────────────
        $this->crearBloque($zonaNewId, 'BRC-N1', 'Galería Norte 1', 'nicho',       4, 10, 12);
        $this->crearBloque($zonaNewId, 'BRC-N2', 'Galería Norte 2', 'nicho',       4,  8,  8);
        $this->crearBloque($zonaNewId, 'BRC-COL', 'Columbarios',    'columbario',  5,  6,  0);

        $this->command->info("Cementerio demo creado (id={$cemId}) con 5 bloques.");
    }

    private function crearBloque(
        int    $zonaId,
        string $codigo,
        string $nombre,
        string $tipo,
        int    $filas,
        int    $columnas,
        int    $ocupadasAleatorias = 0
    ): void {
        $bloqueId = DB::table('cemn_bloques')->insertGetId([
            'zona_id'   => $zonaId,
            'codigo'    => $codigo,
            'nombre'    => $nombre,
            'tipo'      => $tipo,
            'filas'     => $filas,
            'columnas'  => $columnas,
            'created_at'=> now(),
            'updated_at'=> now(),
        ]);

        $sepulturas = [];
        $num = 1;
        for ($f = 1; $f <= $filas; $f++) {
            for ($c = 1; $c <= $columnas; $c++) {
                $sepulturas[] = [
                    'zona_id'    => $zonaId,
                    'bloque_id'  => $bloqueId,
                    'fila'       => $f,
                    'columna'    => $c,
                    'numero'     => $num,
                    'codigo'     => "{$codigo}-F{$f}-C{$c}",
                    'tipo'       => $tipo,
                    'estado'     => 'libre',
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
                $num++;
            }
        }

        // Marcar algunas como ocupadas
        if ($ocupadasAleatorias > 0) {
            $indices = array_rand($sepulturas, min($ocupadasAleatorias, count($sepulturas)));
            if (!is_array($indices)) $indices = [$indices];
            foreach ($indices as $i) {
                $sepulturas[$i]['estado'] = 'ocupada';
            }
        }

        foreach (array_chunk($sepulturas, 100) as $chunk) {
            DB::table('cemn_sepulturas')->insert($chunk);
        }
    }
}
