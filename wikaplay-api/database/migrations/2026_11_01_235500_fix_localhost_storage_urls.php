<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Fix flashcards image_url and audio_url
        if (Schema::hasTable('flashcards')) {
            DB::statement("UPDATE flashcards SET image_url = REPLACE(image_url, 'http://localhost/storage/', 'https://wikaplay-api.onrender.com/storage/') WHERE image_url LIKE '%localhost/storage/%'");
            DB::statement("UPDATE flashcards SET image_url = REPLACE(image_url, 'https://localhost/storage/', 'https://wikaplay-api.onrender.com/storage/') WHERE image_url LIKE '%localhost/storage/%'");
            DB::statement("UPDATE flashcards SET image_url = '' WHERE image_url LIKE '%wikaplay.app%'");

            DB::statement("UPDATE flashcards SET audio_url = REPLACE(audio_url, 'http://localhost/storage/', 'https://wikaplay-api.onrender.com/storage/') WHERE audio_url LIKE '%localhost/storage/%'");
            DB::statement("UPDATE flashcards SET audio_url = REPLACE(audio_url, 'https://localhost/storage/', 'https://wikaplay-api.onrender.com/storage/') WHERE audio_url LIKE '%localhost/storage/%'");
        }

        // 2. Fix quiz_questions target_image_url
        if (Schema::hasTable('quiz_questions')) {
            DB::statement("UPDATE quiz_questions SET target_image_url = REPLACE(target_image_url, 'http://localhost/storage/', 'https://wikaplay-api.onrender.com/storage/') WHERE target_image_url LIKE '%localhost/storage/%'");
            DB::statement("UPDATE quiz_questions SET target_image_url = REPLACE(target_image_url, 'https://localhost/storage/', 'https://wikaplay-api.onrender.com/storage/') WHERE target_image_url LIKE '%localhost/storage/%'");
            DB::statement("UPDATE quiz_questions SET target_image_url = '' WHERE target_image_url LIKE '%wikaplay.app%'");
        }

        // 3. Fix quiz_question_choices image_url
        if (Schema::hasTable('quiz_question_choices')) {
            DB::statement("UPDATE quiz_question_choices SET image_url = REPLACE(image_url, 'http://localhost/storage/', 'https://wikaplay-api.onrender.com/storage/') WHERE image_url LIKE '%localhost/storage/%'");
            DB::statement("UPDATE quiz_question_choices SET image_url = REPLACE(image_url, 'https://localhost/storage/', 'https://wikaplay-api.onrender.com/storage/') WHERE image_url LIKE '%localhost/storage/%'");
            DB::statement("UPDATE quiz_question_choices SET image_url = '' WHERE image_url LIKE '%wikaplay.app%'");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op
    }
};
