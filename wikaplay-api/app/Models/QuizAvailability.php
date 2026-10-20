<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class QuizAvailability extends Model
{
    use HasFactory;

    protected $fillable = [
        'category_id',
        'difficulty',
        'is_locked',
        'pass_score',
    ];

    protected $casts = [
        'is_locked' => 'boolean',
        'pass_score' => 'integer',
    ];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }
}
