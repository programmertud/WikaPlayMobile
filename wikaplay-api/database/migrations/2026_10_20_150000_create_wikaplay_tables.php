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
        // 1. Categories
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('cover_image')->nullable();
            $table->string('color', 20)->default('#38BDF8');
            $table->boolean('is_published')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        // 2. Flashcards
        Schema::create('flashcards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained('categories')->cascadeOnDelete();
            $table->string('name');
            $table->string('filipino_name');
            $table->string('english_name')->nullable();
            $table->text('description')->nullable();
            $table->string('image_url');
            $table->string('audio_url')->nullable();
            $table->boolean('is_published')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        // 3. Quiz Availability & Settings
        Schema::create('quiz_availabilities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained('categories')->cascadeOnDelete();
            $table->enum('difficulty', ['madali', 'katamtaman', 'mahirap']);
            $table->boolean('is_locked')->default(false);
            $table->unsignedInteger('pass_score')->default(3);
            $table->timestamps();

            $table->unique(['category_id', 'difficulty']);
        });

        // 4. Quiz Questions
        Schema::create('quiz_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained('categories')->cascadeOnDelete();
            $table->enum('difficulty', ['madali', 'katamtaman', 'mahirap']);
            // Crucial: Katamtaman questions link to a flashcard to reuse its published audio and image
            $table->foreignId('flashcard_id')->nullable()->constrained('flashcards')->nullOnDelete();
            $table->string('question_text')->nullable();
            $table->string('target_item_name');
            $table->string('target_image_url');
            $table->string('audio_url')->nullable();
            $table->json('choices'); // Array of { id: string, image_url: string, text: string }
            $table->string('correct_answer');
            $table->unsignedInteger('points')->default(1);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        // 5. Quiz Sessions
        Schema::create('quiz_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('category_id')->constrained('categories')->cascadeOnDelete();
            $table->enum('difficulty', ['madali', 'katamtaman', 'mahirap']);
            $table->unsignedInteger('score')->default(0);
            $table->unsignedInteger('total_questions')->default(0);
            $table->unsignedInteger('correct_count')->default(0);
            $table->unsignedInteger('wrong_count')->default(0);
            $table->boolean('passed')->default(false);
            $table->unsignedInteger('stars_awarded')->default(0);
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });

        // 6. Quiz Answers
        Schema::create('quiz_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quiz_session_id')->constrained('quiz_sessions')->cascadeOnDelete();
            $table->foreignId('question_id')->constrained('quiz_questions')->cascadeOnDelete();
            $table->string('selected_answer');
            $table->boolean('is_correct');
            $table->timestamps();
        });

        // 7. Mini-Game Sessions
        Schema::create('minigame_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('game_type'); // memory_match, paghahanap_larawan, hulaan_salita, gulong_letra, pop_balloon
            $table->unsignedInteger('score')->default(0);
            $table->unsignedInteger('duration_seconds')->default(0);
            $table->unsignedInteger('stars_awarded')->default(0);
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        // 8. Star Transactions (Idempotent ledger)
        Schema::create('star_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->integer('amount'); // Positive for earned, negative for spent
            $table->unsignedInteger('balance_after');
            $table->string('source_type'); // quiz_session, minigame_session, reward_claim, bonus, adjustment
            $table->unsignedBigInteger('source_id')->nullable();
            $table->string('description')->nullable();
            $table->timestamps();
        });

        // 9. Collectibles
        Schema::create('collectibles', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->string('filipino_name');
            $table->text('description')->nullable();
            $table->string('image_url');
            $table->string('audio_url')->nullable();
            $table->enum('rarity', ['common', 'rare', 'epic', 'legendary'])->default('common');
            $table->unsignedInteger('required_stars')->default(10);
            $table->timestamps();
        });

        // 10. Student Collectibles
        Schema::create('student_collectibles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('collectible_id')->constrained('collectibles')->cascadeOnDelete();
            $table->timestamp('unlocked_at');
            $table->boolean('is_mystery_revealed')->default(false);
            $table->timestamps();

            $table->unique(['user_id', 'collectible_id']);
        });

        // 11. Student Presences (Multi-device monitoring)
        Schema::create('student_presences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->boolean('is_online')->default(false);
            $table->string('current_activity')->nullable(); // 'Naglalaro ng Memory Match', 'Nagsasagot ng Quiz', etc.
            $table->string('current_screen')->nullable();
            $table->string('current_game_or_quiz')->nullable();
            $table->timestamp('session_started_at')->nullable();
            $table->timestamp('last_active_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('student_presences');
        Schema::dropIfExists('student_collectibles');
        Schema::dropIfExists('collectibles');
        Schema::dropIfExists('star_transactions');
        Schema::dropIfExists('minigame_sessions');
        Schema::dropIfExists('quiz_answers');
        Schema::dropIfExists('quiz_sessions');
        Schema::dropIfExists('quiz_questions');
        Schema::dropIfExists('quiz_availabilities');
        Schema::dropIfExists('flashcards');
        Schema::dropIfExists('categories');
    }
};
