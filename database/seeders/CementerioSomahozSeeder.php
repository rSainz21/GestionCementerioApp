<?php

namespace Database\Seeders;

use App\Models\CemnBloque;
use App\Models\CemnCementerio;
use App\Models\CemnConcesion;
use App\Models\CemnConcesionTercero;
use App\Models\CemnDifunto;
use App\Models\CemnSepultura;
use App\Models\CemnTercero;
use App\Models\CemnZona;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CementerioSomahozSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            // Limpieza (orden por FKs)
            CemnConcesionTercero::query()->delete();
            CemnConcesion::query()->delete();
            CemnDifunto::query()->delete();
            CemnSepultura::query()->delete();
            CemnBloque::query()->delete();
            CemnZona::query()->delete();
            CemnCementerio::query()->delete();
            CemnTercero::query()->delete();

            $cementerio = CemnCementerio::create([
                'nombre' => 'Cementerio Municipal de Somahoz',
                'municipio' => 'Los Corrales de Buelna',
                'direccion' => 'Somahoz (Cantabria)',
                'notas' => 'Datos de ejemplo para desarrollo local.',
            ]);

            $zonaVieja = CemnZona::create([
                'cementerio_id' => $cementerio->id,
                'nombre' => 'Parte vieja',
                'codigo' => 'VIEJA',
                'descripcion' => 'Sepulturas en tierra (históricas).',
            ]);

            $zonaNueva = CemnZona::create([
                'cementerio_id' => $cementerio->id,
                'nombre' => 'Parte nueva',
                'codigo' => 'NUEVA',
                'descripcion' => 'Nichos y columbarios por bloques.',
            ]);

            // Bloques (nichos/columbarios) con cuadrículas exactas
            $bloqueNichosA = CemnBloque::create([
                'zona_id' => $zonaNueva->id,
                'nombre' => 'Bloque Nichos A',
                'codigo' => 'NA',
                'tipo' => 'nichos',
                'filas' => 8,
                'columnas' => 10,
                'descripcion' => 'Ejemplo: bloque de nichos 8×10.',
            ]);

            $bloqueNichosB = CemnBloque::create([
                'zona_id' => $zonaNueva->id,
                'nombre' => 'Bloque Nichos B',
                'codigo' => 'NB',
                'tipo' => 'nichos',
                'filas' => 6,
                'columnas' => 12,
                'descripcion' => 'Ejemplo: bloque de nichos 6×12.',
            ]);

            $bloqueColA = CemnBloque::create([
                'zona_id' => $zonaNueva->id,
                'nombre' => 'Bloque Columbarios A',
                'codigo' => 'CA',
                'tipo' => 'columbarios',
                'filas' => 5,
                'columnas' => 8,
                'descripcion' => 'Ejemplo: bloque de columbarios 5×8.',
            ]);

            // Generación de celdas (sepulturas) por bloque
            $this->generarCeldasDeBloque($bloqueNichosA);
            $this->generarCeldasDeBloque($bloqueNichosB);
            $this->generarCeldasDeBloque($bloqueColA);

            // Parte vieja: unas pocas sepulturas (sin bloque, con "parte" y "numero")
            for ($i = 1; $i <= 12; $i++) {
                CemnSepultura::create([
                    'zona_id' => $zonaVieja->id,
                    'bloque_id' => null,
                    'tipo' => 'sepultura',
                    'numero' => $i,
                    'parte' => $i <= 6 ? 'NORTE' : 'SUR',
                    'codigo' => 'VIEJA-'.$i,
                    'estado' => CemnSepultura::ESTADO_LIBRE,
                    'ubicacion_texto' => 'Parte vieja · Sepultura '.$i,
                ]);
            }

            // Ocupamos algunas celdas para que el grid muestre rojos con tooltip
            $this->ocuparAlgunasCeldas($bloqueNichosA->id, 9);
            $this->ocuparAlgunasCeldas($bloqueNichosB->id, 6);
            $this->ocuparAlgunasCeldas($bloqueColA->id, 4);

            // Reservamos y clausuramos un par para ver estados extra
            $this->marcarEstadoEnBloque($bloqueNichosA->id, 1, 1, CemnSepultura::ESTADO_RESERVADA);
            $this->marcarEstadoEnBloque($bloqueNichosA->id, 1, 2, CemnSepultura::ESTADO_CLAUSURADA);
        });
    }

    private function generarCeldasDeBloque(CemnBloque $bloque): void
    {
        $tipo = $bloque->tipo === 'columbarios' ? 'columbario' : 'nicho';

        for ($fila = 1; $fila <= $bloque->filas; $fila++) {
            for ($col = 1; $col <= $bloque->columnas; $col++) {
                CemnSepultura::create([
                    'zona_id' => $bloque->zona_id,
                    'bloque_id' => $bloque->id,
                    'tipo' => $tipo,
                    'fila' => $fila,
                    'columna' => $col,
                    'codigo' => CemnSepultura::generarCodigo($bloque, $fila, $col),
                    'estado' => CemnSepultura::ESTADO_LIBRE,
                ]);
            }
        }
    }

    private function ocuparAlgunasCeldas(int $bloqueId, int $cuantas): void
    {
        $celdas = CemnSepultura::query()
            ->where('bloque_id', $bloqueId)
            ->where('estado', CemnSepultura::ESTADO_LIBRE)
            ->inRandomOrder()
            ->limit($cuantas)
            ->get();

        foreach ($celdas as $celda) {
            $titular = CemnTercero::create([
                'dni' => strtoupper(Str::random(8)).'X',
                'nombre' => 'Titular',
                'apellido1' => 'Ejemplo',
                'apellido2' => (string) rand(1, 99),
                'telefono' => '600'.rand(100000, 999999),
                'direccion' => 'Calle Ejemplo '.rand(1, 50),
                'municipio' => 'Los Corrales de Buelna',
                'provincia' => 'Cantabria',
                'cp' => '39400',
                'es_empresa' => false,
            ]);

            $concesion = CemnConcesion::create([
                'sepultura_id' => $celda->id,
                'numero_expediente' => 'EXP-'.date('Y').'-'.str_pad((string) rand(1, 9999), 4, '0', STR_PAD_LEFT),
                'tipo' => 'temporal',
                'fecha_concesion' => now()->subYears(rand(0, 10))->toDateString(),
                'duracion_anos' => 10,
                'estado' => 'vigente',
                'importe' => 0,
                'moneda' => 'euros',
            ]);

            CemnConcesionTercero::create([
                'concesion_id' => $concesion->id,
                'tercero_id' => $titular->id,
                'rol' => 'concesionario',
                'fecha_desde' => $concesion->fecha_concesion,
                'activo' => true,
            ]);

            CemnDifunto::create([
                'tercero_id' => null,
                'nombre_completo' => 'Difunto '.Str::upper(Str::random(5)),
                'fecha_fallecimiento' => now()->subDays(rand(5, 5000))->toDateString(),
                'fecha_inhumacion' => now()->subDays(rand(1, 5000))->toDateString(),
                'sepultura_id' => $celda->id,
                'es_titular' => true,
            ]);

            $celda->estado = CemnSepultura::ESTADO_OCUPADA;
            $celda->save();
        }
    }

    private function marcarEstadoEnBloque(int $bloqueId, int $fila, int $columna, string $estado): void
    {
        $celda = CemnSepultura::query()
            ->where('bloque_id', $bloqueId)
            ->where('fila', $fila)
            ->where('columna', $columna)
            ->first();

        if (!$celda) return;

        $celda->estado = $estado;
        $celda->save();
    }
}

