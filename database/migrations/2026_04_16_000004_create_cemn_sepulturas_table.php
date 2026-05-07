<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cemn_sepulturas', function (Blueprint $table) {
            $table->unsignedInteger('id')->autoIncrement();
            $table->unsignedInteger('zona_id');
            $table->unsignedInteger('bloque_id')->nullable();

            // 'sepultura' | 'nicho' | 'columbario' | 'panteon'
            $table->string('tipo', 20)->default('nicho');

            $table->unsignedInteger('numero')->nullable();
            $table->unsignedSmallInteger('fila')->nullable();
            $table->unsignedSmallInteger('columna')->nullable();

            // Orientación en parte vieja (Norte, Sur, Este, Oeste…)
            $table->string('parte', 20)->nullable();

            // Código único de referencia: e.g. "B1-F2-C3"
            $table->string('codigo', 40)->nullable()->unique();

            // 'libre' | 'ocupada' | 'reservada' | 'clausurada'
            $table->string('estado', 20)->default('libre');

            $table->decimal('largo_m', 4, 2)->nullable();
            $table->decimal('ancho_m', 4, 2)->nullable();
            $table->string('ubicacion_texto', 500)->nullable();
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lon', 10, 7)->nullable();
            $table->string('imagen', 500)->nullable();
            $table->text('notas')->nullable();
            $table->timestamps();

            $table->foreign('zona_id')
                  ->references('id')->on('cemn_zonas')
                  ->restrictOnDelete()->restrictOnUpdate();

            $table->foreign('bloque_id')
                  ->references('id')->on('cemn_bloques')
                  ->restrictOnDelete()->restrictOnUpdate();

            $table->index('zona_id');
            $table->index('bloque_id');
            $table->index('tipo');
            $table->index('estado');
            $table->index('numero');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cemn_sepulturas');
    }
};
