<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cemn_difuntos', function (Blueprint $table) {
            $table->unsignedInteger('concesion_id')->nullable()->after('sepultura_id');
            $table->foreign('concesion_id')->references('id')->on('cemn_concesiones')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('cemn_difuntos', function (Blueprint $table) {
            $table->dropForeign(['concesion_id']);
            $table->dropColumn('concesion_id');
        });
    }
};
