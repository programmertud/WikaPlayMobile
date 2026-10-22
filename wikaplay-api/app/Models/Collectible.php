<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Collectible extends Model
{
    use HasFactory;

    protected $fillable = [
        'slug',
        'name',
        'filipino_name',
        'category',
        'description',
        'image_url',
        'audio_url',
        'rarity',
        'required_stars',
    ];

    protected $casts = [
        'required_stars' => 'integer',
    ];

    public function students()
    {
        return $this->belongsToMany(User::class, 'student_collectibles')
            ->withPivot('unlocked_at', 'is_mystery_revealed')
            ->withTimestamps();
    }
}
