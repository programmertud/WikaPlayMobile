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
        if (Schema::hasTable('collectibles') && !Schema::hasColumn('collectibles', 'category')) {
            Schema::table('collectibles', function (Blueprint $table) {
                $table->string('category')->default('Mga Hayop')->after('filipino_name');
            });
        }

        if (Schema::hasTable('minigame_sessions') && !Schema::hasColumn('minigame_sessions', 'session_id')) {
            Schema::table('minigame_sessions', function (Blueprint $table) {
                $table->string('session_id')->nullable()->unique()->after('user_id');
            });
        }

        if (Schema::hasTable('quiz_sessions') && !Schema::hasColumn('quiz_sessions', 'session_id')) {
            Schema::table('quiz_sessions', function (Blueprint $table) {
                $table->string('session_id')->nullable()->unique()->after('user_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('collectibles') && Schema::hasColumn('collectibles', 'category')) {
            Schema::table('collectibles', function (Blueprint $table) {
                $table->dropColumn('category');
            });
        }

        if (Schema::hasTable('minigame_sessions') && Schema::hasColumn('minigame_sessions', 'session_id')) {
            Schema::table('minigame_sessions', function (Blueprint $table) {
                $table->dropColumn('session_id');
            });
        }

        if (Schema::hasTable('quiz_sessions') && Schema::hasColumn('quiz_sessions', 'session_id')) {
            Schema::table('quiz_sessions', function (Blueprint $table) {
                $table->dropColumn('session_id');
            });
        }
    }
};
