<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cemn_difuntos', function (Blueprint $table) {
            $table->string('estado_inhumacion')->default('inhumado')->after('sepultura_id');
            $table->date('fecha_exhumacion')->nullable()->after('fecha_inhumacion');
            $table->string('documento_sanidad_path')->nullable()->after('foto_path');
            $table->text('motivo_exhumacion')->nullable()->after('documento_sanidad_path');
        });
    }

    public function down(): void
    {
        Schema::table('cemn_difuntos', function (Blueprint $table) {
            $table->dropColumn(['estado_inhumacion', 'fecha_exhumacion', 'documento_sanidad_path', 'motivo_exhumacion']);
        });
    }
};
