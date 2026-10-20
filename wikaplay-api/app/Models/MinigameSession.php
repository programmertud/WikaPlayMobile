<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MinigameSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'game_type',
        'score',
        'duration_seconds',
        'stars_awarded',
        'metadata',
    ];

    protected $casts = [
        'score' => 'integer',
        'duration_seconds' => 'integer',
        'stars_awarded' => 'integer',
        'metadata' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
