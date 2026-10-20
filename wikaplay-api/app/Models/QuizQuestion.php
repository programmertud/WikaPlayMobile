<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class QuizQuestion extends Model
{
    use HasFactory;

    protected $fillable = [
        'category_id',
        'difficulty',
        'flashcard_id',
        'question_text',
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
    ];

    protected $appends = [
        'effective_audio_url',
        'effective_image_url',
    ];

    public function category()
    {
        return $this->belongsTo(Category::class);
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
        if ($this->flashcard_id && $this->relationLoaded('flashcard') && $this->flashcard) {
            return $this->flashcard->audio_url ?: $this->audio_url;
        }

        if ($this->flashcard_id) {
            $flashcard = $this->flashcard;
            if ($flashcard && !empty($flashcard->audio_url)) {
                return $flashcard->audio_url;
            }
        }

        return $this->audio_url;
    }

    /**
     * Resolves the current target image url dynamically from flashcard if linked.
     */
    public function getEffectiveImageUrlAttribute(): string
    {
        if ($this->flashcard_id && $this->relationLoaded('flashcard') && $this->flashcard) {
            return $this->flashcard->image_url ?: $this->target_image_url;
        }

        if ($this->flashcard_id) {
            $flashcard = $this->flashcard;
            if ($flashcard && !empty($flashcard->image_url)) {
                return $flashcard->image_url;
            }
        }

        return $this->target_image_url;
    }
}
