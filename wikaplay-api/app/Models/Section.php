<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Section extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'school_year',
        'teacher_id',
        'status',
        'enrollment_code',
    ];

    protected static function booted(): void
    {
        static::creating(function ($section) {
            if (empty($section->enrollment_code)) {
                $section->enrollment_code = static::generateUniqueCode();
            }
        });
    }

    public static function generateUniqueCode(): string
    {
        do {
            $code = strtoupper(Str::random(10));
        } while (static::where('enrollment_code', $code)->exists());

        return $code;
    }

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function students()
    {
        return $this->hasMany(User::class, 'section_id')->where('role', 'student');
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function isOwnedBy(User $teacher): bool
    {
        return (int)$this->teacher_id === (int)$teacher->id;
    }
}
