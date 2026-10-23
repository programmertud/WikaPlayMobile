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
        // 1. Student Badges
        Schema::create('student_badges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('badge_key', 50);
            $table->unsignedInteger('threshold')->default(50);
            $table->timestamp('unlocked_at')->nullable();
            $table->timestamp('claimed_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'badge_key']);
        });

        // 2. Student Missions (Daily and Weekly tracking)
        Schema::create('student_missions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('period_type', 20)->default('daily'); // daily, weekly
            $table->string('period_key', 30); // e.g. '2026-10-23' or '2026-W43'
            $table->string('mission_key', 50);
            $table->unsignedInteger('progress')->default(0);
            $table->unsignedInteger('target')->default(1);
            $table->boolean('is_completed')->default(false);
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'period_key', 'mission_key']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('student_missions');
        Schema::dropIfExists('student_badges');
    }
};
