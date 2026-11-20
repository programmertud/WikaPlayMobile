<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Persistent database storage for uploaded images and audio recordings.
     * Prevents data loss on Render ephemeral containers.
     */
    public function up(): void
    {
        if (! Schema::hasTable('media_files')) {
            Schema::create('media_files', function (Blueprint $table) {
                $table->id();
                $table->string('filename')->unique();
                $table->string('mime_type')->default('application/octet-stream');
                $table->longText('data')->nullable();
                $table->unsignedBigInteger('size')->default(0);
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('media_files');
    }
};
