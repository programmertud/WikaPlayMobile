<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Flashcard extends Model
{
    use HasFactory;

    protected $fillable = [
        'category_id',
        'name',
        'filipino_name',
        'english_name',
        'description',
        'image_url',
        'audio_url',
        'is_published',
        'sort_order',
    ];

    protected $casts = [
        'is_published' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function linkedQuestions()
    {
        return $this->hasMany(QuizQuestion::class, 'flashcard_id');
    }
}
