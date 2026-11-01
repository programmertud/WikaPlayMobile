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
        // Delete extra flashcards that were added beyond the original curriculum
        // Original curriculum has IDs up to ~150 (20 per category * ~8 categories)
        // Delete flashcards with ID > 150 that don't belong to a specific section
        $query = DB::table('flashcards')->where('id', '>', 150);
        if (Schema::hasColumn('flashcards', 'section_id')) {
            $query->whereNull('section_id');
        }
        $query->delete();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Cannot restore deleted flashcards without a backup
    }
};
