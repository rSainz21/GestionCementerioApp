<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cemn_concesiones', function (Blueprint $table) {
            $table->unsignedInteger('id')->autoIncrement();
            $table->unsignedInteger('sepultura_id');
            $table->string('numero_expediente', 30)->nullable();

            // 'perpetua' | 'temporal'
            $table->string('tipo', 20)->default('temporal');

            $table->date('fecha_concesion')->nullable();
            $table->date('fecha_vencimiento')->nullable();
            $table->unsignedInteger('duracion_anos')->nullable();

            // 'vigente' | 'caducada' | 'renovada' | 'transferida' | 'anulada'
            $table->string('estado', 20)->default('vigente');

            $table->decimal('importe', 10, 2)->nullable();
            // 'pesetas' | 'euros'
            $table->string('moneda', 10)->nullable()->default('euros');
            $table->text('texto_concesion')->nullable();

            // Auto-referencia para cadena de renovaciones/transferencias
            $table->unsignedInteger('concesion_previa_id')->nullable();

            $table->text('notas')->nullable();
            $table->timestamps();

            $table->foreign('sepultura_id')
                  ->references('id')->on('cemn_sepulturas')
                  ->restrictOnDelete()->restrictOnUpdate();

            $table->index('sepultura_id');
            $table->index('estado');
            $table->index('fecha_concesion');
            $table->index('numero_expediente');
        });

        // FK auto-referencial: se añade después de crear la tabla
        Schema::table('cemn_concesiones', function (Blueprint $table) {
            $table->foreign('concesion_previa_id')
                  ->references('id')->on('cemn_concesiones')
                  ->restrictOnDelete()->restrictOnUpdate();
        });
    }

    public function down(): void
    {
        Schema::table('cemn_concesiones', function (Blueprint $table) {
            $table->dropForeign(['concesion_previa_id']);
        });
        Schema::dropIfExists('cemn_concesiones');
    }
};
