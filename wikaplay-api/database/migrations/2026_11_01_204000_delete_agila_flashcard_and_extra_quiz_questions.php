<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Remove the test "agilasssss"/"Eaglessss" flashcard (card #21 in mga-hayop)
     * and extra quiz questions 21-43 in madali for mga-hayop that were added beyond
     * the official 20-question curriculum.
     */
    public function up(): void
    {
        // 1. Delete the "agilasssss" flashcard — match by name (case-insensitive)
        DB::table('flashcards')
            ->where(function ($q) {
                $q->where('filipino_name', 'LIKE', '%agila%')
                  ->orWhere('name', 'LIKE', '%agila%')
                  ->orWhere('english_name', 'LIKE', '%eagle%');
            })
            ->whereNotIn('filipino_name', ['agila']) // keep a real "agila" if it existed originally
            ->delete();

        // Also delete any flashcard whose filipino_name contains repeated characters
        // that look like test entries (e.g., "agilasssss", "Eaglessss")
        DB::table('flashcards')
            ->where(function ($q) {
                $q->where('filipino_name', 'LIKE', '%sss%')
                  ->orWhere('english_name', 'LIKE', '%sss%');
            })
            ->delete();

        // 2. Find the mga-hayop category ID
        $hayopCategory = DB::table('categories')
            ->where('slug', 'mga-hayop')
            ->first();

        if ($hayopCategory) {
            // Delete extra madali quiz questions beyond the first 20 for mga-hayop
            // Get sorted question IDs for madali difficulty in mga-hayop
            $questionIds = DB::table('quiz_questions')
                ->where('category_id', $hayopCategory->id)
                ->where('difficulty', 'madali')
                ->orderBy('id')
                ->pluck('id');

            // Keep only the first 20 (if any), delete the rest
            if ($questionIds->count() > 20) {
                $toDelete = $questionIds->slice(20)->values();
                // Nullify foreign keys in quiz_answers first
                DB::table('quiz_answers')
                    ->whereIn('question_id', $toDelete)
                    ->update(['question_id' => null]);
                // Now delete the extra questions
                DB::table('quiz_questions')
                    ->whereIn('id', $toDelete)
                    ->delete();
            }

            // Also delete ALL madali questions for mga-hayop that were auto-generated
            // (local quiz bank is used instead — no DB questions needed for madali)
            // Only delete if there's no custom section-specific question
            DB::table('quiz_questions')
                ->where('category_id', $hayopCategory->id)
                ->where('difficulty', 'madali')
                ->whereNull('section_id')
                ->get()
                ->each(function ($q) {
                    DB::table('quiz_answers')
                        ->where('question_id', $q->id)
                        ->update(['question_id' => null]);
                    DB::table('quiz_questions')
                        ->where('id', $q->id)
                        ->delete();
                });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Cannot restore deleted data
    }
};
