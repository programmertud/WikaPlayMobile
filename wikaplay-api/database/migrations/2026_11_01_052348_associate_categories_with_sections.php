<?php

use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Existing categories remain with section_id = NULL (global/shared)
        // New categories created by teachers will be associated with their sections
        // This migration is informational - no data changes needed
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No changes to reverse
    }
};
