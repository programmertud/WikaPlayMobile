<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    use HasFactory;

    protected $fillable = [
        'slug',
        'name',
        'title',
        'description',
        'cover_image',
        'color',
        'is_published',
        'sort_order',
    ];

    protected $casts = [
        'is_published' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function flashcards()
    {
        return $this->hasMany(Flashcard::class)->orderBy('sort_order');
    }

    public function quizAvailabilities()
    {
        return $this->hasMany(QuizAvailability::class);
    }

    public function quizQuestions()
    {
        return $this->hasMany(QuizQuestion::class)->orderBy('sort_order');
    }

    public function quizSessions()
    {
        return $this->hasMany(QuizSession::class);
    }
}
