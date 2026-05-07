<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('cemn_zonas', function (Blueprint $table) {
            $table->json('polygon')->nullable()->after('lon');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cemn_zonas', function (Blueprint $table) {
            $table->dropColumn('polygon');
        });
    }
};
