<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cemn_concesion_terceros', function (Blueprint $table) {
            $table->unsignedInteger('id')->autoIncrement();
            $table->unsignedInteger('concesion_id');
            $table->unsignedInteger('tercero_id');

            // 'concesionario' | 'heredero' | 'solicitante'
            $table->string('rol', 20)->default('concesionario');

            $table->date('fecha_desde')->nullable();
            $table->date('fecha_hasta')->nullable();
            $table->boolean('activo')->default(true);
            $table->text('notas')->nullable();
            $table->timestamps();

            $table->foreign('concesion_id')
                  ->references('id')->on('cemn_concesiones')
                  ->restrictOnDelete()->restrictOnUpdate();

            $table->foreign('tercero_id')
                  ->references('id')->on('cemn_terceros')
                  ->restrictOnDelete()->restrictOnUpdate();

            $table->index(['concesion_id', 'activo']);
            $table->index('tercero_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cemn_concesion_terceros');
    }
};
