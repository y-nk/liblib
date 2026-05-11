<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('memberships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('shelf_id')->constrained()->cascadeOnDelete();
            $table->enum('role', ['owner', 'contributor', 'viewer']);
            $table->timestamps();

            $table->unique(['user_id', 'shelf_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('memberships');
    }
};
