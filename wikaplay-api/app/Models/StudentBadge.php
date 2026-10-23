<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StudentBadge extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'badge_key',
        'threshold',
        'unlocked_at',
        'claimed_at',
    ];

    protected $casts = [
        'threshold' => 'integer',
        'unlocked_at' => 'datetime',
        'claimed_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
