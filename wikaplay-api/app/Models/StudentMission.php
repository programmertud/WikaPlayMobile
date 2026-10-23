<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StudentMission extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'period_type',
        'period_key',
        'mission_key',
        'progress',
        'target',
        'is_completed',
        'completed_at',
    ];

    protected $casts = [
        'progress' => 'integer',
        'target' => 'integer',
        'is_completed' => 'boolean',
        'completed_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
