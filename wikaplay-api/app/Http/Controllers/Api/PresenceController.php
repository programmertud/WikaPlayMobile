<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StudentPresence;
use Illuminate\Http\Request;

class PresenceController extends Controller
{
    /**
     * Send student heartbeat to update live monitoring.
     */
    public function heartbeat(Request $request)
    {
        $validated = $request->validate([
            'activity' => 'nullable|string|max:191',
            'screen' => 'nullable|string|max:191',
            'game_or_quiz' => 'nullable|string|max:191',
        ]);

        $user = $request->user();

        // 1. Update current student's presence
        $presence = StudentPresence::updateOrCreate(
            ['user_id' => $user->id],
            [
                'is_online' => true,
                'current_activity' => $validated['activity'] ?? 'Nag-aaral',
                'current_screen' => $validated['screen'] ?? 'dashboard',
                'current_game_or_quiz' => $validated['game_or_quiz'] ?? null,
                'last_active_at' => now(),
            ]
        );

        // 2. Automatically mark sessions inactive if no heartbeat in last 3 minutes
        StudentPresence::where('is_online', true)
            ->where('last_active_at', '<', now()->subMinutes(3))
            ->update([
                'is_online' => false,
                'current_activity' => 'Hindi aktibo',
            ]);

        return response()->json([
            'status' => 'ok',
            'is_online' => true,
            'last_active_at' => $presence->last_active_at,
        ]);
    }
}
