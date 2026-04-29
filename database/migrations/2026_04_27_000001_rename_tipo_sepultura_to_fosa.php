<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('cemn_sepulturas')
            ->where('tipo', 'sepultura')
            ->update(['tipo' => 'fosa']);
    }

    public function down(): void
    {
        DB::table('cemn_sepulturas')
            ->where('tipo', 'fosa')
            ->update(['tipo' => 'sepultura']);
    }
};
