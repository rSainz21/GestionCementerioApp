<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cemn_settings', function (Blueprint $table) {
            $table->id();
            $table->string('grupo', 50);
            $table->string('clave', 100)->unique();
            $table->text('valor')->nullable();
            $table->enum('tipo', ['texto', 'numero', 'color', 'booleano', 'select'])->default('texto');
            $table->string('etiqueta', 150);
            $table->string('descripcion', 255)->nullable();
            $table->json('opciones')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cemn_settings');
    }
};
