<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StudentPresence;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Mobile login via Sanctum tokens.
     */
    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
            'role' => 'nullable|string|in:student,teacher',
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Maling email o password. Pakisubukan muli.'],
            ]);
        }

        // If role filter is provided (e.g. logging into teacher dashboard), verify role
        if (!empty($validated['role']) && $user->role !== $validated['role']) {
            return response()->json([
                'message' => 'Wala kang pahintulot na pumasok gamit ang role na ito.',
            ], 403);
        }

        // Mark online presence
        StudentPresence::updateOrCreate(
            ['user_id' => $user->id],
            [
                'is_online' => true,
                'current_activity' => 'Kakapasok pa lamang',
                'current_screen' => 'dashboard',
                'session_started_at' => now(),
                'last_active_at' => now(),
            ]
        );

        $tokenName = $user->role . '_mobile_token';
        $token = $user->createToken($tokenName)->plainTextToken;

        return response()->json([
            'message' => 'Matagumpay na nakapasok!',
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'avatar' => $user->avatar,
                'section' => $user->section,
                'stars_balance' => $user->stars_balance,
            ],
        ]);
    }

    /**
     * Mobile registration.
     */
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:191',
            'email' => 'required|email|max:191|unique:users,email',
            'password' => 'required|string|min:6',
            'role' => 'nullable|in:student,teacher',
            'section' => 'nullable|string|max:100',
        ]);

        $role = $validated['role'] ?? 'student';

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $role,
            'avatar' => 'https://api.dicebear.com/7.x/bottts/png?seed=' . urlencode($validated['name']) . '&backgroundColor=38bdf8',
            'section' => $validated['section'] ?? 'Kinder - Masayahin',
            'stars_balance' => $role === 'student' ? 10 : 0,
        ]);

        StudentPresence::create([
            'user_id' => $user->id,
            'is_online' => true,
            'current_activity' => 'Bagong mag-aaral',
            'current_screen' => 'dashboard',
            'session_started_at' => now(),
            'last_active_at' => now(),
        ]);

        $token = $user->createToken($role . '_mobile_token')->plainTextToken;

        return response()->json([
            'message' => 'Matagumpay na nakarehistro!',
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'avatar' => $user->avatar,
                'section' => $user->section,
                'stars_balance' => $user->stars_balance,
            ],
        ], 201);
    }

    /**
     * Current authenticated user profile with active stats.
     */
    public function me(Request $request)
    {
        $user = $request->user();

        $stats = [
            'stars_balance' => $user->stars_balance,
            'unlocked_collectibles_count' => $user->studentCollectibles()->count(),
            'quizzes_passed_count' => $user->quizSessions()->where('passed', true)->count(),
            'minigames_played_count' => $user->minigameSessions()->count(),
        ];

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'avatar' => $user->avatar,
                'section' => $user->section,
                'stars_balance' => $user->stars_balance,
            ],
            'stats' => $stats,
        ]);
    }

    /**
     * Mobile logout.
     */
    public function logout(Request $request)
    {
        $user = $request->user();

        if ($user) {
            $user->currentAccessToken()->delete();

            StudentPresence::where('user_id', $user->id)->update([
                'is_online' => false,
                'current_activity' => 'Naka-logout',
                'last_active_at' => now(),
            ]);
        }

        return response()->json([
            'message' => 'Matagumpay na naka-logout.',
        ]);
    }
}
