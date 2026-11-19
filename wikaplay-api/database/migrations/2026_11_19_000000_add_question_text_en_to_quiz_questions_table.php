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
        Schema::table('quiz_questions', function (Blueprint $table) {
            if (! Schema::hasColumn('quiz_questions', 'question_text_en')) {
                $table->text('question_text_en')->nullable()->after('question_text');
            }
            if (! Schema::hasColumn('quiz_questions', 'english_on_top')) {
                $table->boolean('english_on_top')->default(false)->after('question_text_en');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('quiz_questions', function (Blueprint $table) {
            if (Schema::hasColumn('quiz_questions', 'english_on_top')) {
                $table->dropColumn('english_on_top');
            }
            if (Schema::hasColumn('quiz_questions', 'question_text_en')) {
                $table->dropColumn('question_text_en');
            }
        });
    }
};
