<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StudentPresence extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'is_online',
        'current_activity',
        'current_screen',
        'current_game_or_quiz',
        'session_started_at',
        'last_active_at',
    ];

    protected $casts = [
        'is_online' => 'boolean',
        'session_started_at' => 'datetime',
        'last_active_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
