<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Creates the sections table and adds section_id FK to users.
     */
    public function up(): void
    {
        // 1. Sections — the single source of truth for class sections
        Schema::create('sections', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('school_year', 20)->default('2026-2027');
            // Teacher who owns and manages this section (nullable so section can exist before assignment)
            $table->foreignId('teacher_id')->nullable()->constrained('users')->nullOnDelete();
            // active = students may enroll; pending = awaiting admin approval; archived = closed
            $table->enum('status', ['active', 'pending', 'archived'])->default('pending');
            // 10-char cryptographically-generated code students use to enroll
            $table->string('enrollment_code', 10)->unique()->nullable();
            $table->timestamps();

            // No two sections may share the same name in the same school year
            $table->unique(['name', 'school_year']);
        });

        // 2. Add a proper FK section_id to users (preserves existing freeform `section` string column)
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('section_id')
                ->nullable()
                ->after('section')
                ->constrained('sections')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['section_id']);
            $table->dropColumn('section_id');
        });

        Schema::dropIfExists('sections');
    }
};
