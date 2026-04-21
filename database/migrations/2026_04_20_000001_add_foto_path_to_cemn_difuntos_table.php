<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cemn_difuntos', function (Blueprint $table) {
            $table->string('foto_path', 255)->nullable()->after('notas');
            $table->index('foto_path');
        });
    }

    public function down(): void
    {
        Schema::table('cemn_difuntos', function (Blueprint $table) {
            $table->dropIndex(['foto_path']);
            $table->dropColumn('foto_path');
        });
    }
};

