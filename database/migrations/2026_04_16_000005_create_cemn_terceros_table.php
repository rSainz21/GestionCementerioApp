<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cemn_terceros', function (Blueprint $table) {
            $table->unsignedInteger('id')->autoIncrement();
            $table->string('dni', 15)->nullable();
            $table->string('nombre', 60);
            $table->string('apellido1', 60)->nullable();
            $table->string('apellido2', 60)->nullable();

            // Nombre tal cual aparecía en documentos históricos
            $table->string('nombre_original', 200)->nullable();

            $table->string('telefono', 20)->nullable();
            $table->string('email', 120)->nullable();
            $table->string('direccion', 255)->nullable();
            $table->string('municipio', 80)->nullable();
            $table->string('provincia', 80)->nullable();
            $table->string('cp', 10)->nullable();

            $table->boolean('es_empresa')->default(false);
            $table->string('cif', 15)->nullable();
            $table->string('razon_social', 200)->nullable();

            $table->text('notas')->nullable();
            $table->timestamps();

            $table->index('dni');
            $table->index('cif');
            $table->index(['apellido1', 'apellido2', 'nombre']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cemn_terceros');
    }
};
