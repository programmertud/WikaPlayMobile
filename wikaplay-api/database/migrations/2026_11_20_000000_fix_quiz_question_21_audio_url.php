<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Fix Question 21 ("Nasaan ang aso?") audio_url and link it to the proper Aso flashcard.
     */
    public function up(): void
    {
        // 1. Reset Question 21 audio to official mga-hayop_aso.mp3 and link to flashcard 160
        DB::table('quiz_questions')
            ->where('id', 21)
            ->update([
                'audio_url' => 'http://wikaplay-api.onrender.com/storage/audio/mga-hayop_aso.mp3',
                'flashcard_id' => 160,
            ]);

        // 2. Clean up any corrupted .mp4 audio_urls across global questions
        DB::table('quiz_questions')
            ->where('audio_url', 'like', '%izjlYBYRhXGpRLs4UVSc0n1rv5E%')
            ->update([
                'audio_url' => 'http://wikaplay-api.onrender.com/storage/audio/mga-hayop_aso.mp3',
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op
    }
};
