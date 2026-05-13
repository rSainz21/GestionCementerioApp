<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cemn_personas', function (Blueprint $table) {
            $table->unsignedInteger('id')->autoIncrement();

            // Discriminador: 'titular' = concesionario/contacto, 'difunto' = enterrado, 'ambos' = los dos roles
            $table->enum('tipo', ['titular', 'difunto', 'ambos'])->default('difunto');

            // ── Identidad común ────────────────────────────────────────────
            $table->string('nombre', 60)->nullable();
            $table->string('apellido1', 60)->nullable();
            $table->string('apellido2', 60)->nullable();
            // Nombre como texto libre (difuntos históricos o cuando no hay apellidos separados)
            $table->string('nombre_completo', 200)->nullable();
            // Nombre literal tal como aparecía en el documento histórico
            $table->string('nombre_original', 200)->nullable();
            $table->string('dni', 20)->nullable();

            // ── Solo titular / ambos ───────────────────────────────────────
            $table->boolean('es_empresa')->default(false);
            $table->string('cif', 20)->nullable();
            $table->string('razon_social', 200)->nullable();
            $table->string('telefono', 20)->nullable();
            $table->string('email', 120)->nullable();
            $table->string('direccion', 255)->nullable();
            $table->string('municipio', 80)->nullable();
            $table->string('provincia', 80)->nullable();
            $table->string('cp', 10)->nullable();

            // ── Solo difunto / ambos ───────────────────────────────────────
            $table->unsignedInteger('sepultura_id')->nullable();
            $table->unsignedInteger('concesion_id')->nullable();
            $table->date('fecha_fallecimiento')->nullable();
            $table->date('fecha_inhumacion')->nullable();
            $table->date('fecha_exhumacion')->nullable();
            // 'inhumado' | 'restos' | 'exhumado'
            $table->string('estado_inhumacion', 20)->default('inhumado');
            // Persona principal activa del nicho (equivale al antiguo es_titular de cemn_difuntos)
            $table->boolean('es_principal')->default(true);
            $table->string('parentesco', 60)->nullable();
            $table->string('foto_path', 255)->nullable();
            $table->string('documento_sanidad_path')->nullable();
            $table->text('motivo_exhumacion')->nullable();

            // ── Compartidos ────────────────────────────────────────────────
            $table->text('notas')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->foreign('sepultura_id')
                  ->references('id')->on('cemn_sepulturas')
                  ->restrictOnDelete()->restrictOnUpdate();

            $table->foreign('concesion_id')
                  ->references('id')->on('cemn_concesiones')
                  ->restrictOnDelete()->restrictOnUpdate();

            $table->index('tipo');
            $table->index('dni');
            $table->index('cif');
            $table->index(['apellido1', 'apellido2', 'nombre']);
            $table->index(['sepultura_id', 'es_principal']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cemn_personas');
    }
};
