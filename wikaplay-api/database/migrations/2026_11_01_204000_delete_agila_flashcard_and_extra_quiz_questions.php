<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Remove the test "agilasssss"/"Eaglessss" flashcard (card #21 in mga-hayop)
     * and extra quiz questions 21-43 in madali for mga-hayop that were added beyond
     * the official 20-question curriculum.
     */
    public function up(): void
    {
        // 1. Delete the "agilasssss" flashcard (specifically ID 155 or name matches)
        DB::table('flashcards')->where('id', 155)->delete();

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
            $questionIds = DB::table('quiz_questions')
                ->where('category_id', $hayopCategory->id)
                ->where('difficulty', 'madali')
                ->orderBy('id')
                ->pluck('id');

            // Keep only the first 20 (if any), delete the rest
            if ($questionIds->count() > 20) {
                $toDelete = $questionIds->slice(20)->values();
                DB::table('quiz_answers')
                    ->whereIn('question_id', $toDelete)
                    ->update(['question_id' => null]);
                DB::table('quiz_questions')
                    ->whereIn('id', $toDelete)
                    ->delete();
            }

            // Also delete all auto-seeded madali questions for mga-hayop without section_id
            $madaliQuery = DB::table('quiz_questions')
                ->where('category_id', $hayopCategory->id)
                ->where('difficulty', 'madali');

            if (Schema::hasColumn('quiz_questions', 'section_id')) {
                $madaliQuery->whereNull('section_id');
            }

            $madaliQuery->get()->each(function ($q) {
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
