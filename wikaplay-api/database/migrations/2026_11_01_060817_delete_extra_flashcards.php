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
        // Delete extra flashcards that were added beyond the original curriculum
        // Original curriculum has IDs up to ~150 (20 per category * ~8 categories)
        // Delete flashcards with ID > 150 that don't belong to a specific section
        DB::table('flashcards')
            ->where('id', '>', 150)
            ->whereNull('section_id')
            ->delete();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Cannot restore deleted flashcards without a backup
    }
};
