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
        Schema::table('quiz_answers', function (Blueprint $table) {
            // Drop foreign key to allow flexible question identifiers
            $table->dropForeign(['question_id']);
            $table->unsignedBigInteger('question_id')->nullable()->change();
            if (!Schema::hasColumn('quiz_answers', 'question_key')) {
                $table->string('question_key')->nullable()->after('question_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('quiz_answers', function (Blueprint $table) {
            if (Schema::hasColumn('quiz_answers', 'question_key')) {
                $table->dropColumn('question_key');
            }
        });
    }
};
