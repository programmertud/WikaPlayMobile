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
        $legacySlugs = [
            'gintong-agila',
            'tarsier-bohol',
            'bituing-marikit',
            'sampaguita-crown',
            'jeepney-toy',
        ];

        $ids = DB::table('collectibles')->whereIn('slug', $legacySlugs)->pluck('id');

        if ($ids->isNotEmpty()) {
            DB::table('student_collectibles')->whereIn('collectible_id', $ids)->delete();
            DB::table('collectibles')->whereIn('id', $ids)->delete();
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No need to restore legacy test items.
    }
};
