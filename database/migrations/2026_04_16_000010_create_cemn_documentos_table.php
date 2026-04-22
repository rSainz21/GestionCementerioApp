<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cemn_documentos', function (Blueprint $table) {
            $table->unsignedInteger('id')->autoIncrement();
            $table->unsignedInteger('sepultura_id');
            // 'fotografia' | 'escaneo' | 'certificado' | 'solicitud' | 'concesion_doc' | 'plano' | 'otro'
            $table->string('tipo', 30)->default('otro');
            $table->string('nombre_original', 255);
            $table->string('ruta_archivo', 500);
            $table->string('mime_type', 80)->nullable();
            $table->unsignedInteger('tamano_bytes')->nullable();
            $table->text('descripcion')->nullable();
            $table->timestamps();

            $table->foreign('sepultura_id')
                  ->references('id')->on('cemn_sepulturas')
                  ->restrictOnDelete()->restrictOnUpdate();

            $table->index('sepultura_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cemn_documentos');
    }
};
