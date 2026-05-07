<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cemn_bloques', function (Blueprint $table) {
            $table->unsignedInteger('numero_inicio')->nullable()->after('columnas');
            // Cómo se recorre la cuadrícula al numerar:
            // - horizontal: '->' (izq→der) o '<-' (der→izq) (orden de columnas)
            // - vertical: 'down' (arriba→abajo) o 'up' (abajo→arriba) (orden de filas)
            $table->string('numeracion_horizontal', 2)->default('->')->after('numero_inicio');
            $table->string('numeracion_vertical', 4)->default('down')->after('numeracion_horizontal');

            $table->index('numero_inicio');
        });
    }

    public function down(): void
    {
        Schema::table('cemn_bloques', function (Blueprint $table) {
            $table->dropIndex(['numero_inicio']);
            $table->dropColumn(['numero_inicio', 'numeracion_horizontal', 'numeracion_vertical']);
        });
    }
};

