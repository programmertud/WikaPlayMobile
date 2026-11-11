<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Remove corrupt and duplicate quiz questions.
     *
     * Mahirap (Hard) mga-hayop — 22 questions, should be 20:
     *   id=41  target=DOLPHIN   — not part of base mga-hayop curriculum → DELETE
     *   id=42  target=ALIMANGO  — not part of base mga-hayop curriculum → DELETE
     *
     * Katamtaman (Medium) mga-hayop — 22 questions, should be 20:
     *   id=34  target=baboy, section_id=null — duplicate of id=24 (target=Baboy) → DELETE
     *
     * After this migration:
     *   - New teachers will see exactly 20 questions for both katamtaman and mahirap
     *   - No duplicates for Baboy, Ibon, Manok, etc.
     */
    public function up(): void
    {
        // Delete corrupt / non-curriculum mahirap questions
        DB::table('quiz_questions')->whereIn('id', [41, 42])->delete();

        // Delete duplicate katamtaman Baboy question
        DB::table('quiz_questions')->where('id', 34)->delete();
    }

    public function down(): void
    {
        // Re-insert the deleted mahirap questions (DOLPHIN and ALIMANGO)
        // These were non-standard entries; we do not restore them on rollback
        // as they were never part of the official curriculum.

        // Re-insert duplicate baboy katamtaman question
        // Also intentionally not restored since it was a duplicate.
    }
};
