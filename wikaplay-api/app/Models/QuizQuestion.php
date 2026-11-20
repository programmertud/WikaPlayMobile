<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class QuizQuestion extends Model
{
    use HasFactory;

    protected $fillable = [
        'category_id',
        'section_id',
        'difficulty',
        'flashcard_id',
        'question_text',
        'question_text_en',
        'english_on_top',
        'target_item_name',
        'target_image_url',
        'audio_url',
        'choices',
        'correct_answer',
        'points',
        'sort_order',
    ];

    protected $casts = [
        'choices' => 'array',
        'points' => 'integer',
        'sort_order' => 'integer',
        'english_on_top' => 'boolean',
    ];

    protected $appends = [
        'effective_audio_url',
        'effective_image_url',
    ];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function section()
    {
        return $this->belongsTo(Section::class);
    }

    public function flashcard()
    {
        return $this->belongsTo(Flashcard::class);
    }

    public function answers()
    {
        return $this->hasMany(QuizAnswer::class, 'question_id');
    }

    /**
     * Resolves the current published flashcard audio dynamically.
     * Ensures Katamtaman quizzes always use the teacher's updated audio!
     */
    public function getEffectiveAudioUrlAttribute(): ?string
    {
        $rawAudio = $this->audio_url;
        $isCorrupted = ! empty($rawAudio) && (
            str_contains($rawAudio, 'izjlYBYRhXGpRLs4UVSc0n1rv5E') ||
            str_contains($rawAudio, 'd2kSS9nMHwqvSVz2bEkWH1u5g51InlLgLXnNRLVS')
        );

        // For Madali and non-Katamtaman questions: if the question has its own audio recording,
        // it MUST take priority over the flashcard! (e.g. teacher asks "Ano ang nasa litrato?")
        if ($this->difficulty !== 'katamtaman' && ! empty($rawAudio) && ! $isCorrupted) {
            return $rawAudio;
        }

        if (! $isCorrupted && $this->flashcard_id && $this->relationLoaded('flashcard') && $this->flashcard && ! empty($this->flashcard->audio_url)) {
            return $this->flashcard->audio_url;
        }

        if (! $isCorrupted && $this->flashcard_id) {
            $flashcard = $this->flashcard;
            if ($flashcard && ! empty($flashcard->audio_url)) {
                return $flashcard->audio_url;
            }
        }

        // Match by target_item_name in flashcards if flashcard_id is missing/broken or audio was corrupted
        if ($this->target_item_name && $this->category_id) {
            $norm = strtolower(trim($this->target_item_name));
            $fcQuery = Flashcard::where('category_id', $this->category_id)
                ->where(function ($query) use ($norm) {
                    $query->whereRaw('LOWER(filipino_name) = ?', [$norm])
                        ->orWhereRaw('LOWER(name) = ?', [$norm]);
                })
                ->where('is_published', true)
                ->whereNotNull('audio_url')
                ->where('audio_url', '!=', '');

            if ($this->section_id) {
                $fc = (clone $fcQuery)->where('section_id', $this->section_id)->first()
                   ?: $fcQuery->first();
            } else {
                $fc = $fcQuery->first();
            }

            if ($fc && ! empty($fc->audio_url)) {
                return $fc->audio_url;
            }
        }

        if ($isCorrupted) {
            return 'http://wikaplay-api.onrender.com/storage/audio/mga-hayop_aso.mp3';
        }

        return $this->audio_url;
    }

    /**
     * Resolves the current target image url dynamically from flashcard if linked.
     */
    public function getEffectiveImageUrlAttribute(): ?string
    {
        if ($this->flashcard_id && $this->relationLoaded('flashcard') && $this->flashcard) {
            return $this->flashcard->image_url ?: $this->target_image_url;
        }

        if ($this->flashcard_id) {
            $flashcard = $this->flashcard;
            if ($flashcard && ! empty($flashcard->image_url)) {
                return $flashcard->image_url;
            }
        }

        return $this->target_image_url;
    }
}
