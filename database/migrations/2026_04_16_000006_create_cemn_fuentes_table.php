<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cemn_fuentes', function (Blueprint $table) {
            $table->unsignedInteger('id')->autoIncrement();
            $table->string('nombre', 200);
            // 'libro_registro' | 'expediente' | 'padron' | 'escaneo' | 'csv_gestiona' | 'otro'
            $table->string('tipo', 30);
            $table->text('descripcion')->nullable();
            $table->unsignedSmallInteger('periodo_desde')->nullable();
            $table->unsignedSmallInteger('periodo_hasta')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cemn_fuentes');
    }
};
