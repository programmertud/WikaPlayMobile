<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Clean up local file URLs from flashcards
        DB::table('flashcards')
            ->where('image_url', 'like', 'file://%')
            ->orWhere('image_url', 'like', 'blob:%')
            ->update(['image_url' => null]);

        DB::table('flashcards')
            ->where('audio_url', 'like', 'file://%')
            ->orWhere('audio_url', 'like', 'blob:%')
            ->update(['audio_url' => null]);

        // Clean up local file URLs from quiz questions
        DB::table('quiz_questions')
            ->where('target_image_url', 'like', 'file://%')
            ->orWhere('target_image_url', 'like', 'blob:%')
            ->update(['target_image_url' => null]);

        DB::table('quiz_questions')
            ->where('audio_url', 'like', 'file://%')
            ->orWhere('audio_url', 'like', 'blob:%')
            ->update(['audio_url' => null]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // This migration cannot be safely reversed as we don't have the original URLs
        // To restore, you would need to restore from a database backup
    }
};
