<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cemn_difuntos', function (Blueprint $table) {
            $table->unsignedInteger('id')->autoIncrement();

            // Puede o no estar vinculado a un cemn_terceros (para históricos sin datos)
            $table->unsignedInteger('tercero_id')->nullable();

            $table->string('nombre_completo', 200);
            $table->date('fecha_fallecimiento')->nullable();
            $table->date('fecha_inhumacion')->nullable();

            $table->unsignedInteger('sepultura_id')->nullable();

            // Indica si fue el primer inhumado / el titular histórico de la unidad
            $table->boolean('es_titular')->default(true);

            $table->string('parentesco', 60)->nullable();
            $table->text('notas')->nullable();
            $table->timestamps();

            $table->foreign('tercero_id')
                  ->references('id')->on('cemn_terceros')
                  ->restrictOnDelete()->restrictOnUpdate();

            $table->foreign('sepultura_id')
                  ->references('id')->on('cemn_sepulturas')
                  ->restrictOnDelete()->restrictOnUpdate();

            $table->index('tercero_id');
            $table->index('sepultura_id');
            $table->index(['sepultura_id', 'es_titular']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cemn_difuntos');
    }
};
