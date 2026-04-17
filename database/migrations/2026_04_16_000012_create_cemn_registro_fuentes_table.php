<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cemn_registro_fuentes', function (Blueprint $table) {
            $table->unsignedInteger('id')->autoIncrement();
            $table->unsignedInteger('fuente_id');
            // 'sepultura' | 'concesion' | 'tercero' | 'difunto'
            $table->string('entidad_tipo', 20);
            $table->unsignedInteger('entidad_id');
            $table->string('pagina', 20)->nullable();
            // 'alta' | 'media' | 'baja'
            $table->string('confianza', 10)->nullable()->default('media');
            $table->text('notas')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('fuente_id')
                  ->references('id')->on('cemn_fuentes')
                  ->restrictOnDelete()->restrictOnUpdate();

            $table->index('fuente_id');
            $table->index(['entidad_tipo', 'entidad_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cemn_registro_fuentes');
    }
};
