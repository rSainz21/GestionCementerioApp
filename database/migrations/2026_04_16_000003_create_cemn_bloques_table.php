<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cemn_bloques', function (Blueprint $table) {
            $table->unsignedInteger('id')->autoIncrement();
            $table->unsignedInteger('zona_id');
            $table->string('nombre', 80);
            $table->string('codigo', 20)->unique();
            // 'nichos' | 'columbarios' — sepulturas se gestionan sin bloque
            $table->string('tipo', 20)->default('nichos');
            $table->unsignedSmallInteger('filas');
            $table->unsignedSmallInteger('columnas');
            $table->text('descripcion')->nullable();
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lon', 10, 7)->nullable();
            $table->timestamps();

            $table->foreign('zona_id')
                  ->references('id')->on('cemn_zonas')
                  ->restrictOnDelete()->restrictOnUpdate();

            $table->index('zona_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cemn_bloques');
    }
};
