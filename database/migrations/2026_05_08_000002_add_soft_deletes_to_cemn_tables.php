<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cemn_difuntos', fn (Blueprint $t) => $t->softDeletes());
        Schema::table('cemn_concesiones', fn (Blueprint $t) => $t->softDeletes());
        Schema::table('cemn_terceros', fn (Blueprint $t) => $t->softDeletes());
    }

    public function down(): void
    {
        Schema::table('cemn_difuntos',   fn (Blueprint $t) => $t->dropSoftDeletes());
        Schema::table('cemn_concesiones', fn (Blueprint $t) => $t->dropSoftDeletes());
        Schema::table('cemn_terceros',   fn (Blueprint $t) => $t->dropSoftDeletes());
    }
};
