<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Ensures all base curriculum questions remain global (section_id = NULL)
     * so they are always visible to any newly registered teacher and student.
     */
    public function up(): void
    {
        // 1. Restore question 21 ("Nasaan ang aso?") to global curriculum
        DB::table('quiz_questions')
            ->where('id', 21)
            ->update([
                'section_id' => null,
                'question_text' => 'Nasaan ang aso?',
                'target_item_name' => 'Aso',
                'correct_answer' => 'Aso',
            ]);

        // 2. Restore question 28 ("Nasaan ang ibon?") to global curriculum
        DB::table('quiz_questions')
            ->where('id', 28)
            ->update([
                'section_id' => null,
                'question_text' => 'Nasaan ang ibon?',
                'target_item_name' => 'Ibon',
            ]);

        // 3. Restore all core seeded quiz questions (IDs 1 through 100) to global so no teacher account locks them
        DB::table('quiz_questions')
            ->where('id', '<=', 100)
            ->update(['section_id' => null]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op
    }
};
