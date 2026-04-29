<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cemn_bloques', function (Blueprint $table) {
            if (!Schema::hasColumn('cemn_bloques', 'sentido_numeracion')) {
                $table->string('sentido_numeracion', 30)->default('fila_lr_tb')->after('columnas');
            }
            if (!Schema::hasColumn('cemn_bloques', 'numero_inicio')) {
                $table->unsignedInteger('numero_inicio')->default(1)->after('sentido_numeracion');
            }
        });
    }

    public function down(): void
    {
        Schema::table('cemn_bloques', function (Blueprint $table) {
            if (Schema::hasColumn('cemn_bloques', 'numero_inicio')) $table->dropColumn('numero_inicio');
            if (Schema::hasColumn('cemn_bloques', 'sentido_numeracion')) $table->dropColumn('sentido_numeracion');
        });
    }
};

