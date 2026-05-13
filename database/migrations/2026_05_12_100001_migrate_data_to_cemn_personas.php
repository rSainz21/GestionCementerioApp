<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0');

        // ── 1) Tabla de mapeo temporal para terceros ───────────────────────
        DB::statement('
            CREATE TABLE _map_tercero (
                old_id INT UNSIGNED NOT NULL,
                new_id INT UNSIGNED NOT NULL,
                PRIMARY KEY (old_id)
            )
        ');

        // ── 2) Tabla de mapeo temporal para difuntos ───────────────────────
        DB::statement('
            CREATE TABLE _map_difunto (
                old_id INT UNSIGNED NOT NULL,
                new_id INT UNSIGNED NOT NULL,
                PRIMARY KEY (old_id)
            )
        ');

        // ── 3) Migrar terceros → cemn_personas (tipo = 'titular') ──────────
        $terceros = DB::table('cemn_terceros')->get();
        foreach ($terceros as $t) {
            $nombreCompleto = trim(implode(' ', array_filter([
                $t->nombre,
                $t->apellido1,
                $t->apellido2,
            ])));
            if ($t->es_empresa && $t->razon_social) {
                $nombreCompleto = $t->razon_social;
            }

            $newId = DB::table('cemn_personas')->insertGetId([
                'tipo'            => 'titular',
                'nombre'          => $t->nombre,
                'apellido1'       => $t->apellido1,
                'apellido2'       => $t->apellido2,
                'nombre_completo' => $nombreCompleto ?: null,
                'nombre_original' => $t->nombre_original,
                'dni'             => $t->dni,
                'es_empresa'      => $t->es_empresa,
                'cif'             => $t->cif,
                'razon_social'    => $t->razon_social,
                'telefono'        => $t->telefono,
                'email'           => $t->email,
                'direccion'       => $t->direccion,
                'municipio'       => $t->municipio,
                'provincia'       => $t->provincia,
                'cp'              => $t->cp,
                'notas'           => $t->notas,
                'deleted_at'      => $t->deleted_at,
                'created_at'      => $t->created_at,
                'updated_at'      => $t->updated_at,
            ]);

            DB::table('_map_tercero')->insert(['old_id' => $t->id, 'new_id' => $newId]);
        }

        // ── 4) Migrar difuntos → cemn_personas (tipo = 'difunto') ─────────
        $difuntos = DB::table('cemn_difuntos')->get();
        foreach ($difuntos as $d) {
            $newId = DB::table('cemn_personas')->insertGetId([
                'tipo'                   => 'difunto',
                'nombre_completo'        => $d->nombre_completo,
                'dni'                    => null,
                'sepultura_id'           => $d->sepultura_id,
                'concesion_id'           => $d->concesion_id ?? null,
                'fecha_fallecimiento'    => $d->fecha_fallecimiento,
                'fecha_inhumacion'       => $d->fecha_inhumacion,
                'fecha_exhumacion'       => $d->fecha_exhumacion ?? null,
                'estado_inhumacion'      => $d->estado_inhumacion ?? 'inhumado',
                'es_principal'           => $d->es_titular,
                'parentesco'             => $d->parentesco,
                'foto_path'              => $d->foto_path ?? null,
                'documento_sanidad_path' => $d->documento_sanidad_path ?? null,
                'motivo_exhumacion'      => $d->motivo_exhumacion ?? null,
                'notas'                  => $d->notas,
                'deleted_at'             => $d->deleted_at,
                'created_at'             => $d->created_at,
                'updated_at'             => $d->updated_at,
            ]);

            DB::table('_map_difunto')->insert(['old_id' => $d->id, 'new_id' => $newId]);
        }

        // ── 5) Crear pivot cemn_concesion_personas ─────────────────────────
        DB::statement('
            CREATE TABLE cemn_concesion_personas (
                id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                concesion_id  INT UNSIGNED NOT NULL,
                persona_id    INT UNSIGNED NOT NULL,
                rol           VARCHAR(20) NOT NULL DEFAULT \'concesionario\',
                fecha_desde   DATE NULL,
                fecha_hasta   DATE NULL,
                activo        TINYINT(1) NOT NULL DEFAULT 1,
                notas         TEXT NULL,
                created_at    TIMESTAMP NULL,
                updated_at    TIMESTAMP NULL,
                INDEX (concesion_id, activo),
                INDEX (persona_id)
            )
        ');

        // Poblar pivot mapeando old tercero_id → new persona_id
        $pivotRows = DB::table('cemn_concesion_terceros')
            ->join('_map_tercero', 'cemn_concesion_terceros.tercero_id', '=', '_map_tercero.old_id')
            ->select(
                'cemn_concesion_terceros.concesion_id',
                '_map_tercero.new_id as persona_id',
                'cemn_concesion_terceros.rol',
                'cemn_concesion_terceros.fecha_desde',
                'cemn_concesion_terceros.fecha_hasta',
                'cemn_concesion_terceros.activo',
                'cemn_concesion_terceros.notas',
                'cemn_concesion_terceros.created_at',
                'cemn_concesion_terceros.updated_at'
            )
            ->get();

        foreach ($pivotRows as $row) {
            DB::table('cemn_concesion_personas')->insert((array) $row);
        }

        // ── 6) Actualizar cemn_movimientos: difunto_id → persona_id ────────
        // Primero eliminamos la FK vieja
        Schema::table('cemn_movimientos', function (Blueprint $table) {
            $table->dropForeign(['difunto_id']);
        });

        // Renombrar la columna difunto_id → persona_id
        Schema::table('cemn_movimientos', function (Blueprint $table) {
            $table->renameColumn('difunto_id', 'persona_id');
        });

        // Remapear los IDs usando la tabla de mapeo
        DB::statement('
            UPDATE cemn_movimientos m
            JOIN _map_difunto mp ON m.persona_id = mp.old_id
            SET m.persona_id = mp.new_id
        ');

        // Añadir nueva FK a cemn_personas
        Schema::table('cemn_movimientos', function (Blueprint $table) {
            $table->foreign('persona_id')
                  ->references('id')->on('cemn_personas')
                  ->restrictOnDelete()->restrictOnUpdate();
        });

        // ── 7) Eliminar tablas antiguas ────────────────────────────────────
        Schema::dropIfExists('cemn_concesion_terceros');
        Schema::dropIfExists('cemn_difuntos');
        Schema::dropIfExists('cemn_terceros');

        // ── 8) Limpiar tablas de mapeo ─────────────────────────────────────
        Schema::dropIfExists('_map_tercero');
        Schema::dropIfExists('_map_difunto');

        DB::statement('SET FOREIGN_KEY_CHECKS=1');
    }

    public function down(): void
    {
        // La migración de datos es destructiva: no hay rollback automático seguro.
        // Para revertir: restaurar desde backup SQL.
        throw new \RuntimeException('Esta migración no tiene rollback. Restaurar desde backup.');
    }
};
