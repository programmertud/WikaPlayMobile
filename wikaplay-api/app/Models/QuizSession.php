<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class QuizSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'category_id',
        'difficulty',
        'score',
        'total_questions',
        'correct_count',
        'wrong_count',
        'passed',
        'stars_awarded',
        'completed_at',
    ];

    protected $casts = [
        'score' => 'integer',
        'total_questions' => 'integer',
        'correct_count' => 'integer',
        'wrong_count' => 'integer',
        'passed' => 'boolean',
        'stars_awarded' => 'integer',
        'completed_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function answers()
    {
        return $this->hasMany(QuizAnswer::class);
    }
}
