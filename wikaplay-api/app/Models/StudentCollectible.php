<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StudentCollectible extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'collectible_id',
        'unlocked_at',
        'is_mystery_revealed',
    ];

    protected $casts = [
        'unlocked_at' => 'datetime',
        'is_mystery_revealed' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function collectible()
    {
        return $this->belongsTo(Collectible::class);
    }
}
