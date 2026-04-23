<?php

use App\Models\CemnBloque;
use App\Models\CemnConcesion;
use App\Models\CemnDifunto;
use App\Models\CemnSepultura;
use App\Models\CemnZona;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

/**
 * Genera la malla física real de nichos por bloque, asignando:
 * - `cemn_sepulturas.numero` secuencial (nicho 1..N)
 * - `cemn_sepulturas.codigo` canónico estilo "ZV-B6-N1"
 *
 * NO borra datos por defecto. Solo crea sepulturas en bloques que aún no tengan.
 */
Artisan::command('cementerio:generar-malla-real {--force : Si existe algún bloque con sepulturas parciales, intenta completarlo igualmente}', function () {
    $force = (bool) $this->option('force');

    $bloques = CemnBloque::query()
        ->with('zona:id,codigo')
        ->orderBy('id')
        ->get();

    $maxNumero = (int) (CemnSepultura::query()->max('numero') ?? 0);
    $this->info("Max numero actual: {$maxNumero}");

    $createdTotal = 0;

    DB::transaction(function () use ($bloques, $force, &$maxNumero, &$createdTotal) {
        foreach ($bloques as $bloque) {
            $expected = (int) $bloque->filas * (int) $bloque->columnas;
            if ($expected <= 0) {
                $this->warn("Bloque {$bloque->id} ({$bloque->codigo}) sin dimensiones válidas. Saltando.");
                continue;
            }

            $existing = (int) CemnSepultura::query()->where('bloque_id', $bloque->id)->count();
            if ($existing > 0 && $existing < $expected && !$force) {
                $this->warn("Bloque {$bloque->id} ({$bloque->codigo}) tiene {$existing}/{$expected} sepulturas. Usa --force para completar.");
                continue;
            }
            if ($existing >= $expected) {
                $this->line("Bloque {$bloque->id} ({$bloque->codigo}) ya tiene {$existing}/{$expected}. OK.");
                continue;
            }

            $start = $bloque->numero_inicio ?: ($maxNumero + 1);
            $horizontal = $bloque->numeracion_horizontal ?: '->';
            $vertical = $bloque->numeracion_vertical ?: 'down';

            $zonaCodigo = $bloque->zona?->codigo ?: (CemnZona::query()->whereKey($bloque->zona_id)->value('codigo') ?: 'Z');
            $tipoUnidad = $bloque->tipo === 'columbarios' ? 'columbario' : 'nicho';
            $prefix = $tipoUnidad === 'columbario' ? 'C' : 'N';

            $cols = range(1, (int) $bloque->columnas);
            $rows = range(1, (int) $bloque->filas);
            if ($horizontal === '<-') $cols = array_reverse($cols);
            if ($vertical === 'up') $rows = array_reverse($rows);

            $numero = (int) $start;
            $now = now();
            $toInsert = [];

            foreach ($cols as $columna) {
                foreach ($rows as $fila) {
                    $toInsert[] = [
                        'zona_id' => $bloque->zona_id,
                        'bloque_id' => $bloque->id,
                        'tipo' => $tipoUnidad,
                        'numero' => $numero,
                        'fila' => $fila,
                        'columna' => $columna,
                        'codigo' => sprintf('%s-%s-%s%d', $zonaCodigo, $bloque->codigo, $prefix, $numero),
                        'estado' => CemnSepultura::ESTADO_LIBRE,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                    $numero++;
                }
            }

            // Guardamos configuración en el bloque para trazabilidad
            $bloque->numero_inicio = $start;
            $bloque->numeracion_horizontal = $horizontal;
            $bloque->numeracion_vertical = $vertical;
            $bloque->save();

            CemnSepultura::query()->insert($toInsert);

            $created = count($toInsert);
            $createdTotal += $created;
            $maxNumero = max($maxNumero, $start + $created - 1);

            $this->info("Bloque {$bloque->id} ({$bloque->codigo}) → creadas {$created} sepulturas, numeros {$start}..".($start + $created - 1));
        }
    });

    $this->info("Total sepulturas creadas: {$createdTotal}");
})->purpose('Generar malla real de nichos por bloques');

/**
 * Vincula automáticamente concesiones y difuntos a `cemn_sepulturas` por el número de nicho.
 * - Concesiones: busca nº nicho en `texto_concesion` / `notas` y actualiza `sepultura_id`.
 * - Difuntos: busca "nicho XXX" / "casilla XXX" en `notas` y actualiza `sepultura_id`.
 */
Artisan::command('cementerio:autovincular {--dry-run : No escribe, solo muestra cambios}', function () {
    $dry = (bool) $this->option('dry-run');

    $extractNumbers = function (string $text): array {
        $t = mb_strtolower($text, 'UTF-8');
        // Eliminar referencias tipo [1], [23] (notas/footnotes) que NO son números de nicho
        $t = preg_replace('/\[\s*\d+\s*\]/u', ' ', $t) ?? $t;
        // Eliminar referencias de evidencias "foto 42", "foto 5", etc. (no son nichos)
        $t = preg_replace('/\bfoto\s+\d+\b/u', ' ', $t) ?? $t;

        $nums = [];

        // 1) Patrones fuertes (prioridad): "nicho 123", "nichos 12 y 34", "casilla 376"
        if (preg_match_all('/\bnichos?\s+(?:n(?:ú|u)mero(?:s)?\s+)?(\d{1,4})(?:\s*(?:y|,)\s*(\d{1,4}))?/u', $t, $mStrong)) {
            for ($i = 0; $i < count($mStrong[1]); $i++) {
                $nums[] = (int) $mStrong[1][$i];
                if (!empty($mStrong[2][$i])) $nums[] = (int) $mStrong[2][$i];
            }
        }
        if (preg_match_all('/\bcasilla\s+(\d{1,4})\b/u', $t, $mCas)) {
            foreach ($mCas[1] as $n) $nums[] = (int) $n;
        }

        // 2) Palabras españolas básicas (UNO..VEINTE, TREINTA, CUARENTA... + "y")
        // Se usa solo si el texto contiene "nicho" y no hay dígitos relevantes.
        $map = [
            'uno' => 1, 'una' => 1, 'dos' => 2, 'tres' => 3, 'cuatro' => 4, 'cinco' => 5,
            'seis' => 6, 'siete' => 7, 'ocho' => 8, 'nueve' => 9, 'diez' => 10,
            'once' => 11, 'doce' => 12, 'trece' => 13, 'catorce' => 14, 'quince' => 15,
            'dieciseis' => 16, 'dieciséis' => 16, 'diecisiete' => 17, 'dieciocho' => 18, 'diecinueve' => 19,
            'veinte' => 20, 'veintiuno' => 21, 'veintidos' => 22, 'veintidós' => 22, 'veintitres' => 23, 'veintitrés' => 23,
            'veinticuatro' => 24, 'veinticinco' => 25, 'veintiseis' => 26, 'veintiséis' => 26, 'veintisiete' => 27, 'veintiocho' => 28, 'veintinueve' => 29,
            'treinta' => 30, 'cuarenta' => 40, 'cincuenta' => 50, 'sesenta' => 60, 'setenta' => 70, 'ochenta' => 80, 'noventa' => 90,
            'cien' => 100,
        ];

        $maybeParseWordNumber = function (string $chunk) use ($map): ?int {
            $chunk = trim(preg_replace('/[^\p{L}\s]+/u', ' ', $chunk));
            $chunk = preg_replace('/\s+/u', ' ', $chunk);
            if ($chunk === '') return null;

            $parts = explode(' ', $chunk);
            // "treinta y uno"
            if (count($parts) === 3 && $parts[1] === 'y' && isset($map[$parts[0]]) && isset($map[$parts[2]])) {
                return $map[$parts[0]] + $map[$parts[2]];
            }
            // una sola palabra (veintidos, ocho, etc.)
            if (count($parts) === 1 && isset($map[$parts[0]])) {
                return $map[$parts[0]];
            }
            return null;
        };

        // Captura "nicho número X" en palabras (hasta 3 tokens después)
        if (str_contains($t, 'nicho') && empty($nums)) {
            if (preg_match_all('/nicho\s+(?:n(?:ú|u)mero\s+)?([a-záéíóúñ]+(?:\s+y\s+[a-záéíóúñ]+)?)/u', $t, $m2)) {
                foreach ($m2[1] as $w) {
                    $n = $maybeParseWordNumber($w);
                    if ($n !== null) $nums[] = $n;
                }
            }
        }

        // 3) Fallback: dígitos sueltos SOLO si aparecen en el texto ya asociado a nicho/casilla
        if (empty($nums) && (str_contains($t, 'nicho') || str_contains($t, 'casilla'))) {
            if (preg_match_all('/\b(\d{1,4})\b/u', $t, $m)) {
                foreach ($m[1] as $n) $nums[] = (int) $n;
            }
        }

        $nums = array_values(array_unique(array_filter($nums, fn ($n) => $n > 0 && $n <= 5000)));
        sort($nums);
        return $nums;
    };

    $findSepulturaIdByNumero = function (int $numero): ?int {
        return CemnSepultura::query()->where('numero', $numero)->value('id');
    };

    $changes = 0;

    // 1) Concesiones
    $concesiones = CemnConcesion::query()
        ->orderBy('id')
        ->get();

    foreach ($concesiones as $c) {
        $text = trim((string) $c->texto_concesion.' '.$c->notas);
        if ($text === '') continue;

        // Evitamos sepulturas en tierra (no nichos)
        $tLower = mb_strtolower($text, 'UTF-8');
        if (str_contains($tLower, 'sepultura') && !str_contains($tLower, 'nicho')) {
            continue;
        }

        $nums = $extractNumbers($text);
        // Priorizamos números que estén cerca de la palabra nicho/casilla
        if (empty($nums)) continue;

        $targetNumero = $nums[0];
        $sepulturaId = $findSepulturaIdByNumero($targetNumero);
        if (!$sepulturaId) continue;

        if ((int) $c->sepultura_id !== (int) $sepulturaId) {
            $changes++;
            $this->line("Concesión #{$c->id} exp={$c->numero_expediente} → sepultura_id {$c->sepultura_id} ⇒ {$sepulturaId} (nicho {$targetNumero})");
            if (!$dry) {
                $c->sepultura_id = $sepulturaId;
                $extra = count($nums) > 1 ? ('Nichos referenciados: '.implode(', ', $nums)) : null;
                if ($extra) {
                    $c->notas = trim((string) $c->notas);
                    $c->notas = $c->notas ? ($c->notas."\n".$extra) : $extra;
                }
                $c->save();
            }
        }
    }

    // 2) Difuntos (por notas: "nicho X", "casilla X", etc.)
    $difuntos = CemnDifunto::query()
        ->whereNull('sepultura_id')
        ->whereNotNull('notas')
        ->orderBy('id')
        ->get();

    foreach ($difuntos as $d) {
        $text = (string) $d->notas;
        $tLower = mb_strtolower($text, 'UTF-8');
        if (!(str_contains($tLower, 'nicho') || str_contains($tLower, 'casilla'))) {
            continue;
        }

        $nums = $extractNumbers($text);
        if (empty($nums)) continue;

        $targetNumero = $nums[0];
        $sepulturaId = $findSepulturaIdByNumero($targetNumero);
        if (!$sepulturaId) continue;

        $changes++;
        $this->line("Difunto #{$d->id} \"{$d->nombre_completo}\" → sepultura_id NULL ⇒ {$sepulturaId} (nicho {$targetNumero})");
        if (!$dry) {
            $d->sepultura_id = $sepulturaId;
            $d->save();
        }
    }

    $this->info($dry ? "Dry-run completado. Cambios detectados: {$changes}" : "Autovinculación completada. Cambios aplicados: {$changes}");
})->purpose('Vincular concesiones y difuntos a sepulturas por nº de nicho');

/**
 * Renumera las sepulturas de un bloque existente.
 * Útil si un bloque se creó antes de que `numero`/`codigo` fueran obligatorios en la malla.
 */
Artisan::command('cementerio:renumerar-bloque {bloqueId : ID del bloque} {numero_inicio : Nº primer nicho} {--h=-> : Horizontal (-> o <-)} {--v=down : Vertical (down o up)}', function () {
    $bloqueId = (int) $this->argument('bloqueId');
    $start = (int) $this->argument('numero_inicio');
    $h = (string) $this->option('h');
    $v = (string) $this->option('v');

    if ($bloqueId <= 0 || $start <= 0) {
        $this->error('bloqueId y numero_inicio deben ser > 0');
        return 1;
    }
    if (!in_array($h, ['->', '<-'], true) || !in_array($v, ['down', 'up'], true)) {
        $this->error('Opciones inválidas. --h=->|<- y --v=down|up');
        return 1;
    }

    /** @var CemnBloque|null $bloque */
    $bloque = CemnBloque::query()->with('zona:id,codigo')->find($bloqueId);
    if (!$bloque) {
        $this->error("Bloque {$bloqueId} no existe");
        return 1;
    }

    $zonaCodigo = $bloque->zona?->codigo ?: (CemnZona::query()->whereKey($bloque->zona_id)->value('codigo') ?: 'Z');
    $tipoUnidad = $bloque->tipo === 'columbarios' ? 'columbario' : 'nicho';
    $prefix = $tipoUnidad === 'columbario' ? 'C' : 'N';

    $colOrder = range(1, (int) $bloque->columnas);
    $rowOrder = range(1, (int) $bloque->filas);
    if ($h === '<-') $colOrder = array_reverse($colOrder);
    if ($v === 'up') $rowOrder = array_reverse($rowOrder);

    $sepulturas = CemnSepultura::query()
        ->where('bloque_id', $bloque->id)
        ->get(['id', 'fila', 'columna']);

    $byPos = [];
    foreach ($sepulturas as $s) {
        if ($s->fila === null || $s->columna === null) continue;
        $byPos[$s->fila.'-'.$s->columna] = (int) $s->id;
    }

    $numero = $start;
    $updates = 0;

    DB::transaction(function () use ($colOrder, $rowOrder, $byPos, $zonaCodigo, $bloque, $prefix, $start, $h, $v, &$numero, &$updates) {
        foreach ($colOrder as $columna) {
            foreach ($rowOrder as $fila) {
                $id = $byPos[$fila.'-'.$columna] ?? null;
                if (!$id) continue;

                CemnSepultura::query()->whereKey($id)->update([
                    'numero' => $numero,
                    'codigo' => sprintf('%s-%s-%s%d', $zonaCodigo, $bloque->codigo, $prefix, $numero),
                ]);
                $updates++;
                $numero++;
            }
        }

        $bloque->numero_inicio = $start;
        $bloque->numeracion_horizontal = $h;
        $bloque->numeracion_vertical = $v;
        $bloque->save();
    });

    $this->info("Bloque {$bloque->id} ({$bloque->codigo}) renumerado: {$updates} sepulturas, desde {$start}.");
    return 0;
})->purpose('Renumerar un bloque existente');

