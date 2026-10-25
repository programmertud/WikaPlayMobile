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
     * Mobile login: handles both Student (Full Name Only) and Teacher (Email + Password).
     */
    public function login(Request $request)
    {
        // If 'name' is provided and 'password' is not provided, treat as student login
        if ($request->filled('name') && !$request->filled('password')) {
            return $this->studentLogin($request);
        }

        // Standard / Teacher Login with Email and Password
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
            'role' => 'nullable|string|in:student,teacher,admin',
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Maling email o password. Pakisubukan muli.'],
            ]);
        }

        if (!empty($validated['role']) && $user->role !== $validated['role']) {
            return response()->json([
                'message' => 'Wala kang pahintulot na pumasok gamit ang role na ito.',
            ], 403);
        }

        return $this->issueSession($user, 'Matagumpay na nakapasok ang guro!');
    }

    /**
     * Kindergarten Student Login — Full Name Only.
     * No password required. Strict normalization and duplicate-handling.
     */
    public function studentLogin(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|min:2|max:100',
        ], [
            'name.required' => 'Pakilagay ang iyong buong pangalan.',
            'name.min' => 'Masyadong maikli ang pangalan.',
            'name.max' => 'Masyadong mahaba ang pangalan.',
        ]);

        $normalized = User::normalizeName($validated['name']);

        $candidates = User::where('role', 'student')
            ->where(function ($q) use ($normalized) {
                $q->where('normalized_name', $normalized)
                  ->orWhere('name', $normalized);
            })
            ->get();

        if ($candidates->isEmpty()) {
            return response()->json([
                'message' => 'Hindi namin makita ang pangalang ito. Pakisuri ang iyong pangalan o magpatulong sa iyong guro.',
            ], 404);
        }

        if ($candidates->count() > 1) {
            return response()->json([
                'message' => 'Mayroong higit sa isang mag-aaral na may parehong pangalan. Pakipag-ugnayan sa iyong guro para sa tulong.',
                'has_duplicate' => true,
            ], 409);
        }

        $student = $candidates->first();

        if ($student->status === 'disabled') {
            return response()->json([
                'message' => 'Ang iyong account ay kasalukuyang hindi aktibo. Makipag-ugnayan sa iyong guro.',
            ], 403);
        }

        if ($student->status === 'pending_approval') {
            return response()->json([
                'message' => 'Ang iyong account ay naghihintay pa ng pag-apruba ng guro.',
            ], 403);
        }

        return $this->issueSession($student, 'Maligayang pagbabalik, ' . $student->name . '!');
    }

    /**
     * Mobile registration: handles both Student (Full Name Only) and Teacher (Email + Password).
     */
    public function register(Request $request)
    {
        // If student registration with Full Name Only
        if ($request->filled('name') && (!$request->filled('email') || !$request->filled('password'))) {
            return $this->studentRegister($request);
        }

        // Full Teacher / Admin registration
        $validated = $request->validate([
            'name' => 'required|string|max:191',
            'email' => 'required|email|max:191|unique:users,email',
            'password' => 'required|string|min:6',
            'role' => 'nullable|in:student,teacher',
            'section' => 'nullable|string|max:100',
        ]);

        $role = $validated['role'] ?? 'teacher';

        $user = User::create([
            'name' => trim(preg_replace('/\s+/', ' ', $validated['name'])),
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $role,
            'avatar' => 'https://api.dicebear.com/7.x/bottts/png?seed=' . urlencode($validated['name']) . '&backgroundColor=38bdf8',
            'section' => $validated['section'] ?? ($role === 'student' ? 'Kinder - Masayahin' : 'Kaguruan'),
            'status' => 'active',
            'stars_balance' => 0,
        ]);

        return $this->issueSession($user, 'Matagumpay na nakarehistro!', 201);
    }

    /**
     * Kindergarten Student Registration — Full Name Only.
     * Generates internal unique student ID, default section and avatar.
     */
    public function studentRegister(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|min:2|max:100',
            'section' => 'nullable|string|max:100',
        ], [
            'name.required' => 'Pakilagay ang iyong buong pangalan para makapagrehistro.',
            'name.min' => 'Masyadong maikli ang pangalan.',
            'name.max' => 'Masyadong mahaba ang pangalan.',
        ]);

        $rawName = trim(preg_replace('/\s+/', ' ', $validated['name']));
        $normalized = User::normalizeName($rawName);

        // Check for duplicate registered student
        $existing = User::where('role', 'student')
            ->where('normalized_name', $normalized)
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'Nakarirehistro na ang pangalang ito. Maaari ka nang mag-login o magpatulong sa iyong guro.',
            ], 422);
        }

        $student = User::create([
            'name' => $rawName,
            'role' => 'student',
            'avatar' => 'https://api.dicebear.com/7.x/bottts/png?seed=' . urlencode($rawName) . '&backgroundColor=38bdf8',
            'section' => $validated['section'] ?? 'Kinder - Masayahin',
            'status' => 'active',
            'stars_balance' => 0,
        ]);

        return $this->issueSession($student, 'Maligayang pagdating sa WikaPlay, ' . $student->name . '!', 201);
    }

    /**
     * Issue Sanctum token, track presence, and format response.
     */
    protected function issueSession(User $user, string $message, int $status = 200)
    {
        // Mark online presence
        StudentPresence::updateOrCreate(
            ['user_id' => $user->id],
            [
                'is_online' => true,
                'current_activity' => $user->isTeacher() ? 'Nasa Teacher Dashboard' : 'Kapasok pa lamang',
                'current_screen' => $user->isTeacher() ? 'teacher_dashboard' : 'student_home',
                'session_started_at' => now(),
                'last_active_at' => now(),
            ]
        );

        $tokenName = $user->role . '_mobile_token';
        $token = $user->createToken($tokenName)->plainTextToken;

        return response()->json([
            'message' => $message,
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'student_id_code' => $user->student_id_code,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'avatar' => $user->avatar,
                'section' => $user->section,
                'status' => $user->status,
                'stars_balance' => $user->stars_balance,
            ],
        ], $status);
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
                'student_id_code' => $user->student_id_code,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'avatar' => $user->avatar,
                'section' => $user->section,
                'status' => $user->status,
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

    /**
     * Update user profile (Name, Avatar, Section).
     * Works for both Teachers and Students.
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'nullable|string|min:2|max:100',
            'avatar' => 'nullable|string|max:65535',
            'section' => 'nullable|string|max:100',
        ], [
            'name.min' => 'Masyadong maikli ang pangalan.',
            'name.max' => 'Masyadong mahaba ang pangalan.',
        ]);

        if ($request->filled('name')) {
            $rawName = trim(preg_replace('/\s+/', ' ', $validated['name']));

            if ($user->role === 'student') {
                $normalized = User::normalizeName($rawName);
                $duplicate = User::where('role', 'student')
                    ->where('id', '!=', $user->id)
                    ->where('normalized_name', $normalized)
                    ->first();

                if ($duplicate) {
                    return response()->json([
                        'message' => 'Mayroon nang mag-aaral na may katulad na pangalan. Pakilagay ang buong pangalan kasama ang apelyido.',
                    ], 422);
                }
                $user->normalized_name = $normalized;
            }

            $user->name = $rawName;
        }

        if ($request->has('avatar') && !empty($request->input('avatar'))) {
            $user->avatar = $request->input('avatar');
        }

        if ($request->filled('section')) {
            $user->section = $request->input('section');
        }

        $user->save();

        return response()->json([
            'message' => 'Matagumpay na na-update ang profile!',
            'user' => [
                'id' => $user->id,
                'student_id_code' => $user->student_id_code,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'avatar' => $user->avatar,
                'section' => $user->section,
                'status' => $user->status,
                'stars_balance' => $user->stars_balance,
            ],
        ]);
    }

    /**
     * Upload Avatar image from mobile (Camera or Gallery)
     * Supports both multipart file upload and base64 payload.
     */
    public function uploadAvatar(Request $request)
    {
        $user = $request->user();

        // 1. Multipart file upload
        if ($request->hasFile('avatar') || $request->hasFile('image')) {
            $file = $request->file('avatar') ?? $request->file('image');
            $request->validate([
                'avatar' => 'nullable|file|max:15360',
                'image' => 'nullable|file|max:15360',
            ]);

            $path = $file->store('avatars', 'public');
            $storageUrl = config('app.url') . '/storage/' . $path;

            $user->avatar = $storageUrl;
            $user->save();

            return response()->json([
                'message' => 'Matagumpay na na-upload ang iyong profile picture!',
                'avatar' => $storageUrl,
                'user' => [
                    'id' => $user->id,
                    'student_id_code' => $user->student_id_code,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'avatar' => $user->avatar,
                    'section' => $user->section,
                    'status' => $user->status,
                    'stars_balance' => $user->stars_balance,
                ],
            ]);
        }

        // 2. Base64 payload
        if ($request->filled('image_base64')) {
            $base64Data = $request->input('image_base64');
            if (preg_match('/^data:image\/(\w+);base64,/', $base64Data, $type)) {
                $base64Data = substr($base64Data, strpos($base64Data, ',') + 1);
                $type = strtolower($type[1]);
                $decoded = base64_decode($base64Data);
                $filename = 'avatars/' . uniqid() . '.' . $type;
                \Illuminate\Support\Facades\Storage::disk('public')->put($filename, $decoded);
                $storageUrl = config('app.url') . '/storage/' . $filename;

                $user->avatar = $storageUrl;
                $user->save();

                return response()->json([
                    'message' => 'Matagumpay na na-upload ang iyong profile picture!',
                    'avatar' => $storageUrl,
                    'user' => [
                        'id' => $user->id,
                        'student_id_code' => $user->student_id_code,
                        'name' => $user->name,
                        'email' => $user->email,
                        'role' => $user->role,
                        'avatar' => $user->avatar,
                        'section' => $user->section,
                        'status' => $user->status,
                        'stars_balance' => $user->stars_balance,
                    ],
                ]);
            }
        }

        return response()->json([
            'message' => 'Walang natanggap na larawan.',
        ], 400);
    }
}

