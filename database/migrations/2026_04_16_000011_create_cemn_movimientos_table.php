<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cemn_movimientos', function (Blueprint $table) {
            $table->unsignedInteger('id')->autoIncrement();
            $table->unsignedInteger('difunto_id');
            // 'inhumacion' | 'exhumacion' | 'traslado'
            $table->string('tipo', 20);
            $table->date('fecha')->nullable();
            $table->unsignedInteger('sepultura_origen_id')->nullable();
            $table->unsignedInteger('sepultura_destino_id')->nullable();
            $table->string('numero_expediente', 30)->nullable();
            $table->text('notas')->nullable();
            $table->timestamps();

            $table->foreign('difunto_id')
                  ->references('id')->on('cemn_difuntos')
                  ->restrictOnDelete()->restrictOnUpdate();

            $table->foreign('sepultura_origen_id')
                  ->references('id')->on('cemn_sepulturas')
                  ->restrictOnDelete()->restrictOnUpdate();

            $table->foreign('sepultura_destino_id')
                  ->references('id')->on('cemn_sepulturas')
                  ->restrictOnDelete()->restrictOnUpdate();

            $table->index('difunto_id');
            $table->index('tipo');
            $table->index('fecha');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cemn_movimientos');
    }
};
