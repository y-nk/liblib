<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('books', function (Blueprint $table) {
            $table->foreignId('shelf_id')->constrained()->cascadeOnDelete();
            $table->string('isbn');
            $table->string('title');
            $table->string('cover_url')->nullable();
            $table->json('tags')->default('[]');
            $table->text('note')->default('');
            $table->boolean('favorite')->default(false);
            $table->string('collection_id')->nullable();
            $table->timestamps();
            $table->timestamp('deleted_at')->nullable();

            $table->primary(['shelf_id', 'isbn']);
            $table->index('updated_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('books');
    }
};
