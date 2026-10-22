<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'normalized_name',
        'student_id_code',
        'email',
        'password',
        'role',
        'avatar',
        'section',
        'status',
        'stars_balance',
    ];

    public static function normalizeName(string $name): string
    {
        $cleaned = preg_replace('/\s+/', ' ', trim($name));
        return mb_strtolower($cleaned, 'UTF-8');
    }

    protected static function booted(): void
    {
        static::saving(function ($user) {
            if (!empty($user->name)) {
                $user->normalized_name = static::normalizeName($user->name);
            }
            if ($user->role === 'student' && empty($user->student_id_code)) {
                $user->student_id_code = 'WP-' . date('Y') . '-' . str_pad((string) mt_rand(1, 99999), 5, '0', STR_PAD_LEFT);
            }
        });
    }

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'stars_balance' => 'integer',
        ];
    }

    public function isTeacher(): bool
    {
        return $this->role === 'teacher' || $this->role === 'admin';
    }

    public function isStudent(): bool
    {
        return $this->role === 'student';
    }

    public function starTransactions()
    {
        return $this->hasMany(StarTransaction::class);
    }

    public function quizSessions()
    {
        return $this->hasMany(QuizSession::class);
    }

    public function minigameSessions()
    {
        return $this->hasMany(MinigameSession::class);
    }

    public function studentCollectibles()
    {
        return $this->hasMany(StudentCollectible::class);
    }

    public function collectibles()
    {
        return $this->belongsToMany(Collectible::class, 'student_collectibles')
            ->withPivot('unlocked_at', 'is_mystery_revealed')
            ->withTimestamps();
    }

    public function presence()
    {
        return $this->hasOne(StudentPresence::class);
    }
}
