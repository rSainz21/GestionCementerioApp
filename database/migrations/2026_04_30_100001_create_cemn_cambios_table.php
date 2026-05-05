<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cemn_cambios', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedInteger('sepultura_id')->nullable();
            $table->unsignedBigInteger('user_id')->nullable();

            // Ej: "sepultura.update", "sepultura.create", "sepultura.move"
            $table->string('accion', 60);

            // Ej: {"estado":{"from":"libre","to":"ocupada"}, "lat":{"from":..,"to":..}}
            $table->json('diff')->nullable();

            $table->timestamps();

            $table->index(['sepultura_id', 'created_at']);
            $table->index(['user_id', 'created_at']);

            $table->foreign('sepultura_id')
                ->references('id')->on('cemn_sepulturas')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cemn_cambios');
    }
};

