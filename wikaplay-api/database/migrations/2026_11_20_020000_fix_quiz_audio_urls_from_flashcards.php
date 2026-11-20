<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Fixes quiz questions with broken audio URLs by syncing from their matching flashcards.
     */
    public function up(): void
    {
        // 1. Specifically fix question 1319 (Pato) in section 17
        $patoFc = DB::table('flashcards')
            ->where('category_id', 1)
            ->where('section_id', 17)
            ->where(function ($q) {
                $q->where('filipino_name', 'Pato')
                  ->orWhere('name', 'Pato');
            })
            ->first();

        if ($patoFc && ! empty($patoFc->audio_url)) {
            DB::table('quiz_questions')
                ->where('id', 1319)
                ->update([
                    'flashcard_id' => $patoFc->id,
                    'audio_url' => $patoFc->audio_url,
                ]);
        }

        // 2. Also fix any quiz_questions where audio_url is missing, corrupted, or contains old broken hash
        $brokenQuestions = DB::table('quiz_questions')
            ->where(function ($q) {
                $q->whereNull('audio_url')
                  ->orWhere('audio_url', '')
                  ->orWhere('audio_url', 'like', '%d2kSS9nMHwqvSVz2bEkWH1u5g51InlLgLXnNRLVS%')
                  ->orWhere('audio_url', 'like', '%izjlYBYRhXGpRLs4UVSc0n1rv5E%');
            })
            ->get();

        foreach ($brokenQuestions as $bq) {
            $target = trim(strtolower($bq->target_item_name ?: $bq->correct_answer ?: ''));
            if (empty($target)) continue;

            $fcQuery = DB::table('flashcards')
                ->where('category_id', $bq->category_id)
                ->where(function ($sq) use ($target) {
                    $sq->whereRaw('LOWER(filipino_name) = ?', [$target])
                      ->orWhereRaw('LOWER(name) = ?', [$target]);
                })
                ->whereNotNull('audio_url')
                ->where('audio_url', '!=', '');

            if ($bq->section_id) {
                $fc = (clone $fcQuery)->where('section_id', $bq->section_id)->first()
                   ?: $fcQuery->first();
            } else {
                $fc = $fcQuery->first();
            }

            if ($fc && ! empty($fc->audio_url)) {
                DB::table('quiz_questions')
                    ->where('id', $bq->id)
                    ->update([
                        'flashcard_id' => $fc->id,
                        'audio_url' => $fc->audio_url,
                    ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op
    }
};
