<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Flashcard;
use App\Models\MinigameSession;
use App\Models\QuizAvailability;
use App\Models\QuizQuestion;
use App\Models\QuizSession;
use App\Models\StudentPresence;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class TeacherController extends Controller
{
    /**
     * Enforce teacher authorization.
     */
    protected function authorizeTeacher(Request $request)
    {
        $user = $request->user();
        if (!$user || !$user->isTeacher()) {
            abort(403, 'Ang bahaging ito ay para lamang sa mga guro.');
        }
    }

    /**
     * Real-time student monitoring list.
     */
    public function students(Request $request)
    {
        $this->authorizeTeacher($request);

        // Mark stale presences as offline first
        StudentPresence::where('is_online', true)
            ->where('last_active_at', '<', now()->subMinutes(3))
            ->update([
                'is_online' => false,
                'current_activity' => 'Hindi aktibo',
            ]);

        $students = User::where('role', 'student')
            ->with('presence')
            ->withCount([
                'quizSessions as quizzes_passed' => fn($q) => $q->where('passed', true),
                'minigameSessions as games_played',
                'studentCollectibles as collectibles_count',
            ])
            ->get()
            ->map(function ($s) {
                $presence = $s->presence;
                $isOnline = $presence ? $presence->is_online : false;

                return [
                    'id' => $s->id,
                    'name' => $s->name,
                    'email' => $s->email,
                    'avatar' => $s->avatar,
                    'section' => $s->section,
                    'stars_balance' => $s->stars_balance,
                    'quizzes_passed' => $s->quizzes_passed,
                    'games_played' => $s->games_played,
                    'collectibles_count' => $s->collectibles_count,
                    'is_online' => $isOnline,
                    'current_activity' => $presence ? $presence->current_activity : 'Offline',
                    'current_screen' => $presence ? $presence->current_screen : null,
                    'current_game_or_quiz' => $presence ? $presence->current_game_or_quiz : null,
                    'last_active_at' => $presence && $presence->last_active_at ? $presence->last_active_at->diffForHumans() : 'Kamakailan',
                ];
            });

        return response()->json([
            'students' => $students,
            'total_students' => $students->count(),
            'online_count' => $students->where('is_online', true)->count(),
        ]);
    }

    /**
     * Student history review.
     */
    public function studentHistory(Request $request, $id)
    {
        $this->authorizeTeacher($request);

        $student = User::where('role', 'student')->findOrFail($id);

        $quizHistory = QuizSession::where('user_id', $student->id)
            ->with('category:id,name,color')
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();

        $gameHistory = MinigameSession::where('user_id', $student->id)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();

        return response()->json([
            'student' => $student,
            'quiz_history' => $quizHistory,
            'game_history' => $gameHistory,
        ]);
    }

    /**
     * List all categories (for management).
     */
    public function categories(Request $request)
    {
        $this->authorizeTeacher($request);

        $categories = Category::withCount('flashcards')
            ->with('quizAvailabilities')
            ->orderBy('sort_order')
            ->get();

        return response()->json(['categories' => $categories]);
    }

    /**
     * Create or update category.
     */
    public function saveCategory(Request $request)
    {
        $this->authorizeTeacher($request);

        $validated = $request->validate([
            'id' => 'nullable|exists:categories,id',
            'name' => 'required|string|max:191',
            'title' => 'required|string|max:191',
            'description' => 'nullable|string',
            'cover_image' => 'nullable|string',
            'color' => 'nullable|string|max:20',
            'is_published' => 'nullable|boolean',
        ]);

        $slug = \Illuminate\Support\Str::slug($validated['name']);

        $category = Category::updateOrCreate(
            ['id' => $validated['id'] ?? null],
            [
                'slug' => $slug,
                'name' => $validated['name'],
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'cover_image' => $validated['cover_image'] ?? null,
                'color' => $validated['color'] ?? '#38BDF8',
                'is_published' => $validated['is_published'] ?? true,
            ]
        );

        // Ensure default quiz availabilities exist
        foreach (['madali', 'katamtaman', 'mahirap'] as $diff) {
            QuizAvailability::firstOrCreate(
                ['category_id' => $category->id, 'difficulty' => $diff],
                ['is_locked' => false, 'pass_score' => 3]
            );
        }

        return response()->json([
            'message' => 'Nai-save ang kategorya!',
            'category' => $category,
        ]);
    }

    /**
     * Create or update flashcard (including audio recording / upload).
     */
    public function saveFlashcard(Request $request)
    {
        $this->authorizeTeacher($request);

        $validated = $request->validate([
            'id' => 'nullable|exists:flashcards,id',
            'category_id' => 'required|exists:categories,id',
            'filipino_name' => 'required|string|max:191',
            'english_name' => 'nullable|string|max:191',
            'description' => 'nullable|string',
            'image_url' => 'required|string',
            'audio_url' => 'nullable|string',
            'is_published' => 'nullable|boolean',
        ]);

        $flashcard = Flashcard::updateOrCreate(
            ['id' => $validated['id'] ?? null],
            [
                'category_id' => $validated['category_id'],
                'name' => $validated['filipino_name'],
                'filipino_name' => $validated['filipino_name'],
                'english_name' => $validated['english_name'] ?? null,
                'description' => $validated['description'] ?? null,
                'image_url' => $validated['image_url'],
                'audio_url' => $validated['audio_url'] ?? null,
                'is_published' => $validated['is_published'] ?? true,
            ]
        );

        // Notice: Any Katamtaman quiz question linked to this flashcard
        // will automatically use this updated audio_url and image_url!

        return response()->json([
            'message' => 'Nai-save ang flashcard!',
            'flashcard' => $flashcard,
        ]);
    }

    /**
     * Delete a flashcard.
     */
    public function deleteFlashcard(Request $request, $id)
    {
        $this->authorizeTeacher($request);

        $flashcard = Flashcard::findOrFail($id);
        $flashcard->delete();

        return response()->json(['message' => 'Matagumpay na nabura ang flashcard.']);
    }

    /**
     * Lock or unlock quiz difficulty for a category.
     */
    public function toggleQuizLock(Request $request)
    {
        $this->authorizeTeacher($request);

        $validated = $request->validate([
            'category_id' => 'required|exists:categories,id',
            'difficulty' => 'required|in:madali,katamtaman,mahirap',
            'is_locked' => 'required|boolean',
        ]);

        $availability = QuizAvailability::updateOrCreate(
            [
                'category_id' => $validated['category_id'],
                'difficulty' => $validated['difficulty'],
            ],
            [
                'is_locked' => $validated['is_locked'],
            ]
        );

        return response()->json([
            'message' => $validated['is_locked'] ? 'Naka-lock na ang pagsusulit.' : 'Naka-unlock na ang pagsusulit.',
            'availability' => $availability,
        ]);
    }

    /**
     * Get questions for editing by category and difficulty.
     */
    public function getQuizQuestions(Request $request, $categoryId, $difficulty)
    {
        $this->authorizeTeacher($request);

        $questions = QuizQuestion::where('category_id', $categoryId)
            ->where('difficulty', $difficulty)
            ->with('flashcard')
            ->orderBy('sort_order')
            ->get();

        $category = Category::findOrFail($categoryId);
        $flashcards = Flashcard::where('category_id', $categoryId)->get();
        $availability = QuizAvailability::where('category_id', $categoryId)
            ->where('difficulty', $difficulty)
            ->first();

        return response()->json([
            'category' => $category,
            'difficulty' => $difficulty,
            'availability' => $availability,
            'questions' => $questions,
            'available_flashcards' => $flashcards,
        ]);
    }

    /**
     * Save quiz question with Katamtaman link and validation.
     */
    public function saveQuizQuestion(Request $request)
    {
        $this->authorizeTeacher($request);

        $validated = $request->validate([
            'id' => 'nullable|exists:quiz_questions,id',
            'category_id' => 'required|exists:categories,id',
            'difficulty' => 'required|in:madali,katamtaman,mahirap',
            'flashcard_id' => 'nullable|exists:flashcards,id',
            'question_text' => 'nullable|string',
            'target_item_name' => 'required|string',
            'target_image_url' => 'required|string',
            'audio_url' => 'nullable|string',
            'choices' => 'required|array|min:2',
            'correct_answer' => 'required|string',
            'points' => 'nullable|integer',
        ]);

        $question = QuizQuestion::updateOrCreate(
            ['id' => $validated['id'] ?? null],
            [
                'category_id' => $validated['category_id'],
                'difficulty' => $validated['difficulty'],
                'flashcard_id' => $validated['flashcard_id'] ?? null,
                'question_text' => $validated['question_text'] ?? '',
                'target_item_name' => $validated['target_item_name'],
                'target_image_url' => $validated['target_image_url'],
                'audio_url' => $validated['audio_url'] ?? null,
                'choices' => $validated['choices'],
                'correct_answer' => $validated['correct_answer'],
                'points' => $validated['points'] ?? 1,
            ]
        );

        return response()->json([
            'message' => 'Nai-save ang tanong sa pagsusulit!',
            'question' => $question->load('flashcard'),
        ]);
    }

    /**
     * Upload recorded audio file from mobile device.
     */
    public function uploadAudio(Request $request)
    {
        $this->authorizeTeacher($request);

        $request->validate([
            'audio' => 'required|file|mimes:mp3,m4a,wav,aac,ogg,webm,3gp|max:10240', // 10MB max
        ]);

        $path = $request->file('audio')->store('audio', 'public');
        $url = asset('storage/' . $path);

        return response()->json([
            'message' => 'Matagumpay na nai-upload ang audio!',
            'path' => $path,
            'url' => $url,
        ]);
    }

    /**
     * Upload image file from mobile device.
     */
    public function uploadImage(Request $request)
    {
        $this->authorizeTeacher($request);

        $request->validate([
            'image' => 'required|file|image|max:5120', // 5MB max
        ]);

        $path = $request->file('image')->store('images', 'public');
        $url = asset('storage/' . $path);

        return response()->json([
            'message' => 'Matagumpay na nai-upload ang larawan!',
            'path' => $path,
            'url' => $url,
        ]);
    }
}
