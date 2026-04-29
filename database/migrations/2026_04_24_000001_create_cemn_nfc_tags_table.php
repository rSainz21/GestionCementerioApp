<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cemn_nfc_tags', function (Blueprint $table) {
            $table->unsignedInteger('id')->autoIncrement();
            $table->string('tag_id', 80)->unique();
            $table->unsignedInteger('sepultura_id');
            $table->unsignedInteger('created_by')->nullable();
            $table->timestamps();

            $table->foreign('sepultura_id')
                  ->references('id')->on('cemn_sepulturas')
                  ->cascadeOnDelete()->restrictOnUpdate();
            $table->index('sepultura_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cemn_nfc_tags');
    }
};

