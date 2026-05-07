<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cemn_zonas', function (Blueprint $table) {
            $table->unsignedInteger('id')->autoIncrement();
            $table->unsignedInteger('cementerio_id');
            $table->string('nombre', 80);
            $table->string('codigo', 20)->nullable();
            $table->text('descripcion')->nullable();
            $table->timestamps();

            $table->foreign('cementerio_id')
                  ->references('id')->on('cemn_cementerios')
                  ->restrictOnDelete()->restrictOnUpdate();

            $table->index('cementerio_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cemn_zonas');
    }
};
