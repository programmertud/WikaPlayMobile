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
        if (! Schema::hasColumn('flashcards', 'section_id')) {
            Schema::table('flashcards', function (Blueprint $table) {
                $table->unsignedBigInteger('section_id')->nullable()->after('category_id');
                $table->foreign('section_id')->references('id')->on('sections')->onDelete('cascade');
            });
        }

        if (! Schema::hasColumn('quiz_questions', 'section_id')) {
            Schema::table('quiz_questions', function (Blueprint $table) {
                $table->unsignedBigInteger('section_id')->nullable()->after('category_id');
                $table->foreign('section_id')->references('id')->on('sections')->onDelete('cascade');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('quiz_questions', function (Blueprint $table) {
            $table->dropForeign(['section_id']);
            $table->dropColumn('section_id');
        });

        Schema::table('flashcards', function (Blueprint $table) {
            $table->dropForeign(['section_id']);
            $table->dropColumn('section_id');
        });
    }
};
