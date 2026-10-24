<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Collectible;
use App\Models\Flashcard;
use App\Models\MinigameSession;
use App\Models\QuizAnswer;
use App\Models\QuizAvailability;
use App\Models\QuizQuestion;
use App\Models\QuizSession;
use App\Models\StarTransaction;
use App\Models\StudentBadge;
use App\Models\StudentCollectible;
use App\Models\StudentPresence;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
     * Real-time student monitoring list with accurate star metrics.
     */
    public function students(Request $request)
    {
        $this->authorizeTeacher($request);

        // Mark stale presences as offline (> 3 minutes)
        StudentPresence::where('is_online', true)
            ->where('last_active_at', '<', now()->subMinutes(3))
            ->update([
                'is_online' => false,
                'current_activity' => 'Hindi aktibo',
            ]);

        $studentIds = User::where('role', 'student')->pluck('id');

        $lifetimeStarsMap = StarTransaction::whereIn('user_id', $studentIds)
            ->where('amount', '>', 0)
            ->groupBy('user_id')
            ->selectRaw('user_id, sum(amount) as total')
            ->pluck('total', 'user_id');

        $starsSpentMap = StarTransaction::whereIn('user_id', $studentIds)
            ->where('amount', '<', 0)
            ->groupBy('user_id')
            ->selectRaw('user_id, sum(abs(amount)) as total')
            ->pluck('total', 'user_id');

        $badgesMap = StudentBadge::whereIn('user_id', $studentIds)
            ->whereNotNull('claimed_at')
            ->groupBy('user_id')
            ->selectRaw('user_id, count(*) as count')
            ->pluck('count', 'user_id');

        $students = User::where('role', 'student')
            ->with('presence')
            ->withCount([
                'quizSessions as quizzes_passed' => fn($q) => $q->where('passed', true),
                'minigameSessions as games_played',
                'studentCollectibles as collectibles_count',
            ])
            ->get()
            ->map(function ($s) use ($lifetimeStarsMap, $starsSpentMap, $badgesMap) {
                $presence = $s->presence;
                $isOnline = $presence ? $presence->is_online : false;
                $lifetime = (int) ($lifetimeStarsMap[$s->id] ?? $s->stars_balance);
                $spent = (int) ($starsSpentMap[$s->id] ?? 0);
                $badges = (int) ($badgesMap[$s->id] ?? 0);

                return [
                    'id' => $s->id,
                    'name' => $s->name,
                    'email' => $s->email,
                    'student_id_code' => $s->student_id_code,
                    'avatar' => $s->avatar,
                    'section' => $s->section,
                    'status' => $s->status ?? 'active',
                    'stars_balance' => (int) $s->stars_balance,
                    'lifetime_stars' => $lifetime,
                    'stars_spent' => $spent,
                    'quizzes_passed' => (int) $s->quizzes_passed,
                    'games_played' => (int) $s->games_played,
                    'collectibles_count' => (int) $s->collectibles_count,
                    'badges_count' => $badges,
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
     * Detailed Student History & Learning Statistics.
     */
    public function studentHistory(Request $request, $id)
    {
        $this->authorizeTeacher($request);

        $student = User::where('role', 'student')->findOrFail($id);

        $lifetimeStars = (int) StarTransaction::where('user_id', $student->id)
            ->where('amount', '>', 0)
            ->sum('amount');
        if ($lifetimeStars === 0 && $student->stars_balance > 0) {
            $lifetimeStars = $student->stars_balance;
        }

        $starsSpent = abs((int) StarTransaction::where('user_id', $student->id)
            ->where('amount', '<', 0)
            ->sum('amount'));

        $quizHistory = QuizSession::where('user_id', $student->id)
            ->with('category:id,name,color')
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();

        $gameHistory = MinigameSession::where('user_id', $student->id)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();

        $starTransactions = StarTransaction::where('user_id', $student->id)
            ->orderByDesc('created_at')
            ->limit(30)
            ->get();

        $badges = StudentBadge::where('user_id', $student->id)->get();

        $collectibles = StudentCollectible::where('user_id', $student->id)
            ->with('collectible:id,name,filipino_name,category,image_url,rarity')
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();

        // Calculate accuracy
        $userSessionIds = QuizSession::where('user_id', $student->id)->pluck('id');
        $totalAnswers = QuizAnswer::whereIn('quiz_session_id', $userSessionIds)->count();
        $correctAnswers = QuizAnswer::whereIn('quiz_session_id', $userSessionIds)->where('is_correct', true)->count();
        $accuracy = $totalAnswers > 0 ? round(($correctAnswers / $totalAnswers) * 100) : 0;

        // Categories progress
        $categories = Category::all()->map(function ($cat) use ($student) {
            $sessions = QuizSession::where('user_id', $student->id)
                ->where('category_id', $cat->id)
                ->get();
            $stars = min(60, (int) $sessions->sum('stars_awarded'));
            $attempts = $sessions->count();
            return [
                'id' => $cat->id,
                'name' => $cat->name,
                'color' => $cat->color,
                'stars_earned' => $stars,
                'attempts' => $attempts,
            ];
        });

        return response()->json([
            'student' => [
                'id' => $student->id,
                'name' => $student->name,
                'email' => $student->email,
                'student_id_code' => $student->student_id_code,
                'section' => $student->section,
                'avatar' => $student->avatar,
                'status' => $student->status ?? 'active',
                'stars_balance' => (int) $student->stars_balance,
                'lifetime_stars' => $lifetimeStars,
                'stars_spent' => $starsSpent,
                'accuracy' => $accuracy,
                'quizzes_count' => $quizHistory->count(),
                'games_count' => $gameHistory->count(),
            ],
            'quiz_history' => $quizHistory,
            'game_history' => $gameHistory,
            'star_transactions' => $starTransactions,
            'badges' => $badges,
            'collectibles' => $collectibles,
            'category_progress' => $categories,
        ]);
    }

    /**
     * Teacher Star Adjustment with Required Reason and Audit Trail.
     * Prevents negative balances and strictly maintains transaction ledger.
     */
    public function adjustStudentStars(Request $request, $id)
    {
        $this->authorizeTeacher($request);

        $validated = $request->validate([
            'amount' => 'required|integer|not_in:0',
            'reason' => 'required|string|min:3|max:255',
        ]);

        $student = User::where('role', 'student')->findOrFail($id);

        return DB::transaction(function () use ($request, $student, $validated) {
            $currentBalance = (int) $student->stars_balance;
            $adjustment = (int) $validated['amount'];
            $newBalance = $currentBalance + $adjustment;

            if ($newBalance < 0) {
                return response()->json([
                    'message' => "Hindi maaaring maging negatibo ang balanse ng bituin. Kasalukuyang balanse: {$currentBalance}.",
                ], 422);
            }

            $teacher = $request->user();
            $student->update(['stars_balance' => $newBalance]);

            $tx = StarTransaction::create([
                'user_id' => $student->id,
                'amount' => $adjustment,
                'balance_after' => $newBalance,
                'source_type' => 'teacher_adjustment',
                'source_id' => $teacher->id,
                'description' => "Pagsasaayos ng guro ({$teacher->name}): {$validated['reason']}",
            ]);

            return response()->json([
                'message' => 'Matagumpay na naisaayos ang balanse ng bituin!',
                'student' => [
                    'id' => $student->id,
                    'name' => $student->name,
                    'stars_balance' => $newBalance,
                ],
                'transaction' => $tx,
            ]);
        });
    }

    /**
     * Live Dashboard Statistics for Teacher Overview with all 11 required metrics and charts.
     */
    public function dashboardStats(Request $request)
    {
        $this->authorizeTeacher($request);

        // Update stale presences (> 3 minutes without heartbeat)
        StudentPresence::where('is_online', true)
            ->where('last_active_at', '<', now()->subMinutes(3))
            ->update([
                'is_online' => false,
                'current_activity' => 'Hindi aktibo',
            ]);

        $totalStudents = User::where('role', 'student')->count();
        $onlineStudents = StudentPresence::where('is_online', true)
            ->where('last_active_at', '>=', now()->subMinutes(3))
            ->whereHas('user', fn($q) => $q->where('role', 'student'))
            ->count();
        $recentlyActiveStudents = StudentPresence::where('last_active_at', '>=', now()->subMinutes(15))
            ->whereHas('user', fn($q) => $q->where('role', 'student'))
            ->count();
        $offlineStudents = max(0, $totalStudents - $onlineStudents);

        $totalQuizAttempts = QuizSession::count();
        $completedMinigames = MinigameSession::count();
        $totalSessions = $totalQuizAttempts + $completedMinigames;
        $avgScore = round((float) (QuizSession::avg('score') ?? 0), 1);

        // Accuracy calculation
        $totalAnswers = QuizAnswer::count();
        $correctAnswers = QuizAnswer::where('is_correct', true)->count();
        $averageAccuracy = $totalAnswers > 0 ? round(($correctAnswers / $totalAnswers) * 100) : 0;

        // Star accounting aggregates across all students
        $totalStarsEarned = (int) StarTransaction::where('amount', '>', 0)->sum('amount');
        $totalStarsAvailable = (int) User::where('role', 'student')->sum('stars_balance');
        $totalStarsSpent = abs((int) StarTransaction::where('amount', '<', 0)->sum('amount'));

        // Badges and Collectibles
        $totalBadgesEarned = StudentBadge::whereNotNull('claimed_at')->count();
        $totalCollectiblesClaimed = StudentCollectible::count();

        // Average Learning Progress (% out of 480 milestone)
        $avgLifetimeStars = $totalStudents > 0 ? ($totalStarsEarned / $totalStudents) : 0;
        $averageProgress = round(min(100, ($avgLifetimeStars / 480) * 100));

        // 7-day Participation Chart Data
        $participationOverTime = [];
        $starHistory = [];
        for ($i = 6; $i >= 0; $i--) {
            $day = now()->subDays($i);
            $dayStart = $day->copy()->startOfDay();
            $dayEnd = $day->copy()->endOfDay();

            $qCount = QuizSession::whereBetween('created_at', [$dayStart, $dayEnd])->count();
            $gCount = MinigameSession::whereBetween('created_at', [$dayStart, $dayEnd])->count();
            $participationOverTime[] = [
                'day' => $day->format('D'),
                'date' => $day->format('M d'),
                'quizzes' => $qCount,
                'minigames' => $gCount,
                'total' => $qCount + $gCount,
            ];

            $earnedDay = (int) StarTransaction::where('amount', '>', 0)
                ->whereBetween('created_at', [$dayStart, $dayEnd])
                ->sum('amount');
            $spentDay = abs((int) StarTransaction::where('amount', '<', 0)
                ->whereBetween('created_at', [$dayStart, $dayEnd])
                ->sum('amount'));
            $starHistory[] = [
                'day' => $day->format('D'),
                'date' => $day->format('M d'),
                'earned' => $earnedDay,
                'spent' => $spentDay,
            ];
        }

        // Category Quiz Performance
        $categoryPerformance = Category::withCount('quizSessions')
            ->get()
            ->map(function ($cat) {
                $sessionIds = $cat->quizSessions()->pluck('id');
                $catTotal = QuizAnswer::whereIn('quiz_session_id', $sessionIds)->count();
                $catCorrect = QuizAnswer::whereIn('quiz_session_id', $sessionIds)->where('is_correct', true)->count();
                $catAccuracy = $catTotal > 0 ? round(($catCorrect / $catTotal) * 100) : 0;
                $avgScore = round((float) ($cat->quizSessions()->avg('score') ?? 0), 1);
                return [
                    'id' => $cat->id,
                    'name' => $cat->name,
                    'color' => $cat->color ?: '#8B5CF6',
                    'attempts' => (int) $cat->quiz_sessions_count,
                    'accuracy' => $catAccuracy,
                    'avg_score' => $avgScore,
                ];
            });

        // Activity Completion
        $activityCompletion = [
            'quizzes_passed' => QuizSession::where('passed', true)->count(),
            'quizzes_failed' => QuizSession::where('passed', false)->count(),
            'minigames_completed' => $completedMinigames,
            'mystery_box_qualified' => MinigameSession::where('score', '>=', 15)->count(),
        ];

        // Recent live activities
        $recentActivities = StudentPresence::where('is_online', true)
            ->whereHas('user', fn($q) => $q->where('role', 'student'))
            ->with('user:id,name,student_id_code,avatar,section')
            ->orderByDesc('last_active_at')
            ->limit(8)
            ->get();

        // Recent quiz sessions
        $recentQuizResults = QuizSession::with(['user:id,name,student_id_code', 'category:id,name,color'])
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        // Recent mini-game sessions
        $recentMinigameResults = MinigameSession::with('user:id,name,student_id_code')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        $statsData = [
            'total_students' => $totalStudents,
            'online_students' => $onlineStudents,
            'recently_active_students' => $recentlyActiveStudents,
            'offline_students' => $offlineStudents,
            'total_quiz_attempts' => $totalQuizAttempts,
            'completed_minigames' => $completedMinigames,
            'total_sessions' => $totalSessions,
            'average_quiz_score' => $avgScore,
            'average_accuracy' => $averageAccuracy,
            'average_progress' => $averageProgress,
            'total_stars_earned' => $totalStarsEarned,
            'total_stars_available' => $totalStarsAvailable,
            'total_stars_spent' => $totalStarsSpent,
            'total_badges_earned' => $totalBadgesEarned,
            'total_collectibles_claimed' => $totalCollectiblesClaimed,
        ];

        return response()->json([
            'overview' => $statsData,
            'stats' => $statsData,
            'charts' => [
                'participation_over_time' => $participationOverTime,
                'category_performance' => $categoryPerformance,
                'activity_completion' => $activityCompletion,
                'star_history' => $starHistory,
            ],
            'recent_activities' => $recentActivities,
            'recent_results' => $recentQuizResults,
            'recent_quiz_results' => $recentQuizResults,
            'recent_minigame_results' => $recentMinigameResults,
        ]);
    }

    /**
     * Mini-game management and statistics overview.
     * Supports Memory Match, Paghahanap ng Larawan, Hulaan ang Salita, Gulong ng mga Letra, Pop Balloon.
     */
    public function getMinigamesOverview(Request $request)
    {
        $this->authorizeTeacher($request);

        $gamesCatalog = [
            [
                'id' => 'memory_match',
                'title' => 'Memory Match',
                'description' => 'Ipares ang magkakatulad na larawan (20 antas, 5-segundong silip).',
                'rules' => 'Puntos: 0–20 puntos. 1:1 bituin. 15–20 puntos: Kwalipikado sa mahiwagang kahon.',
                'color' => '#10B981',
            ],
            [
                'id' => 'paghahanap_larawan',
                'title' => 'Paghahanap ng Larawan',
                'description' => 'Makinig sa tunog at piliin ang tamang larawan mula sa mga pagpipilian.',
                'rules' => 'Puntos: 0–20 puntos. 1:1 bituin. 15–20 puntos: Kwalipikado sa mahiwagang kahon.',
                'color' => '#F59E0B',
            ],
            [
                'id' => 'hulaan_salita',
                'title' => 'Hulaan ang Salita',
                'description' => 'Tingnan ang pahiwatig at hulaan ang wastong salitang Filipino.',
                'rules' => 'Puntos: 0–20 puntos. 1:1 bituin. 15–20 puntos: Kwalipikado sa mahiwagang kahon.',
                'color' => '#3B82F6',
            ],
            [
                'id' => 'gulong_letra',
                'title' => 'Gulong ng mga Letra',
                'description' => 'Ayusin ang mga letra upang mabuo ang tamang salita.',
                'rules' => 'Puntos: 0–20 puntos. 1:1 bituin. 15–20 puntos: Kwalipikado sa mahiwagang kahon.',
                'color' => '#8B5CF6',
            ],
            [
                'id' => 'pop_balloon',
                'title' => 'Pop Balloon',
                'description' => 'Paputukin ang lobo na nagtataglay ng tamang sagot bago ito umalis sa screen.',
                'rules' => 'Puntos: 0–20 puntos. 1:1 bituin. 15–20 puntos: Kwalipikado sa mahiwagang kahon.',
                'color' => '#EC4899',
            ],
        ];

        $stats = collect($gamesCatalog)->map(function ($game) {
            $sessions = MinigameSession::where('game_type', $game['id']);
            $totalPlays = $sessions->count();
            $avgScore = round((float) ($sessions->avg('score') ?? 0), 1);
            $qualifiers = $sessions->where('score', '>=', 15)->count();
            $starsAwarded = (int) $sessions->sum('stars_awarded');

            return array_merge($game, [
                'total_plays' => $totalPlays,
                'average_score' => $avgScore,
                'qualifiers_count' => $qualifiers,
                'stars_awarded' => $starsAwarded,
            ]);
        });

        $recentSessions = MinigameSession::with('user:id,name,student_id_code,avatar')
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();

        return response()->json([
            'games' => $stats,
            'recent_sessions' => $recentSessions,
            'total_completed_sessions' => MinigameSession::count(),
            'total_qualifying_sessions' => MinigameSession::where('score', '>=', 15)->count(),
        ]);
    }

    /**
     * Collectibles catalog management (Nakolekta).
     */
    public function getCollectibles(Request $request)
    {
        $this->authorizeTeacher($request);

        $category = $request->query('category');
        $search = $request->query('search');

        $query = Collectible::withCount('students as claims_count');

        if ($category) {
            $query->where('category', $category);
        }
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('filipino_name', 'like', "%{$search}%");
            });
        }

        $collectibles = $query->orderBy('id')->get();
        $totalCollectibles = Collectible::count();
        $totalClaims = StudentCollectible::count();
        $categoriesList = Collectible::distinct()->pluck('category')->filter()->values();

        return response()->json([
            'collectibles' => $collectibles,
            'total_collectibles' => $totalCollectibles,
            'total_claims' => $totalClaims,
            'categories' => $categoriesList,
        ]);
    }

    /**
     * Create or update collectible metadata.
     */
    public function saveCollectible(Request $request)
    {
        $this->authorizeTeacher($request);

        $validated = $request->validate([
            'id' => 'nullable|exists:collectibles,id',
            'name' => 'required|string|max:191',
            'filipino_name' => 'required|string|max:191',
            'category' => 'required|string|max:100',
            'description' => 'required|string',
            'image_url' => 'required|string',
            'audio_url' => 'nullable|string',
            'rarity' => 'nullable|string|in:common,rare,epic,legendary',
        ]);

        $slug = \Illuminate\Support\Str::slug($validated['name']);

        $collectible = Collectible::updateOrCreate(
            ['id' => $validated['id'] ?? null],
            [
                'slug' => $slug,
                'name' => $validated['name'],
                'filipino_name' => $validated['filipino_name'],
                'category' => $validated['category'],
                'description' => $validated['description'],
                'image_url' => $validated['image_url'],
                'audio_url' => $validated['audio_url'] ?? null,
                'rarity' => $validated['rarity'] ?? 'common',
            ]
        );

        return response()->json([
            'message' => 'Nai-save ang collectible kard!',
            'collectible' => $collectible,
        ]);
    }

    /**
     * Gantimpala & Star Audit Overview for Teachers.
     */
    public function getRewardAudit(Request $request)
    {
        $this->authorizeTeacher($request);

        $totalEarned = (int) StarTransaction::where('amount', '>', 0)->sum('amount');
        $totalSpendable = (int) User::where('role', 'student')->sum('stars_balance');
        $totalSpent = abs((int) StarTransaction::where('amount', '<', 0)->sum('amount'));

        // Badges milestone breakdown
        $milestones = [
            ['key' => 'star_collector', 'title' => 'Star Collector', 'threshold' => 50],
            ['key' => 'super_learner', 'title' => 'Super Learner', 'threshold' => 100],
            ['key' => 'quiz_master', 'title' => 'Quiz Master', 'threshold' => 200],
            ['key' => 'learning_champion', 'title' => 'Learning Champion', 'threshold' => 300],
            ['key' => 'ultimate_learner', 'title' => 'Ultimate Learner', 'threshold' => 480],
        ];

        $badgeStats = collect($milestones)->map(function ($m) {
            $claimedCount = StudentBadge::where('badge_key', $m['key'])
                ->whereNotNull('claimed_at')
                ->count();
            return array_merge($m, ['claimed_count' => $claimedCount]);
        });

        $recentTransactions = StarTransaction::with('user:id,name,student_id_code')
            ->orderByDesc('created_at')
            ->limit(30)
            ->get();

        return response()->json([
            'total_earned' => $totalEarned,
            'total_spendable' => $totalSpendable,
            'total_spent' => $totalSpent,
            'badge_stats' => $badgeStats,
            'recent_transactions' => $recentTransactions,
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
     * List all flashcards or filter by category.
     */
    public function getFlashcards(Request $request)
    {
        $this->authorizeTeacher($request);

        $categoryId = $request->query('category_id');
        $search = $request->query('search');

        $query = Flashcard::with('category:id,name,color');

        if ($categoryId) {
            $query->where('category_id', $categoryId);
        }
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('filipino_name', 'like', "%{$search}%")
                  ->orWhere('english_name', 'like', "%{$search}%")
                  ->orWhere('name', 'like', "%{$search}%");
            });
        }

        $flashcards = $query->orderBy('id')->get();

        return response()->json([
            'flashcards' => $flashcards,
            'total_flashcards' => $flashcards->count(),
        ]);
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
            'id' => 'nullable|integer',
            'category_id' => 'required|exists:categories,id',
            'filipino_name' => 'required|string|max:191',
            'english_name' => 'nullable|string|max:191',
            'description' => 'nullable|string',
            'image_url' => 'nullable|string',
            'audio_url' => 'nullable|string',
            'is_published' => 'nullable|boolean',
        ]);

        $flashcard = null;
        if (!empty($validated['id'])) {
            $flashcard = Flashcard::find($validated['id']);
        }
        if (!$flashcard) {
            $flashcard = Flashcard::where('category_id', $validated['category_id'])
                ->where(function ($q) use ($validated) {
                    $q->where('filipino_name', $validated['filipino_name'])
                      ->orWhere('name', $validated['filipino_name']);
                })->first();
        }
        if (!$flashcard) {
            $flashcard = new Flashcard();
        }

        $flashcard->category_id = $validated['category_id'];
        $flashcard->name = $validated['filipino_name'];
        $flashcard->filipino_name = $validated['filipino_name'];
        $flashcard->english_name = $validated['english_name'] ?? null;
        $flashcard->description = $validated['description'] ?? null;
        $flashcard->image_url = $validated['image_url'];
        $flashcard->audio_url = $validated['audio_url'] ?? null;
        $flashcard->is_published = $validated['is_published'] ?? true;
        $flashcard->save();

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

        $hasQuestions = QuizQuestion::where('flashcard_id', $flashcard->id)->exists();
        if ($hasQuestions) {
            $flashcard->is_published = false;
            $flashcard->save();
            return response()->json([
                'message' => 'Nai-archive ang flashcard (itinago mula sa mga mag-aaral upang maprotektahan ang mga nakaraang pagsusulit).',
                'archived' => true,
            ]);
        }

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
            'difficulty' => 'nullable|in:madali,katamtaman,mahirap,all',
            'is_locked' => 'required|boolean',
        ]);

        $diffs = ($request->filled('difficulty') && in_array($request->difficulty, ['madali', 'katamtaman', 'mahirap']))
            ? [$request->difficulty]
            : ['madali', 'katamtaman', 'mahirap'];

        $updated = [];
        foreach ($diffs as $diff) {
            $updated[$diff] = QuizAvailability::updateOrCreate(
                [
                    'category_id' => $validated['category_id'],
                    'difficulty' => $diff,
                ],
                [
                    'is_locked' => $validated['is_locked'],
                ]
            );
        }

        return response()->json([
            'message' => $validated['is_locked']
                ? 'Naka-lock na ang pagsusulit para sa kategoryang ito.'
                : 'Bukas at naka-unlock na ang pagsusulit para sa kategoryang ito.',
            'availabilities' => $updated,
            'availability' => reset($updated),
            'is_locked' => $validated['is_locked'],
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
     * Save quiz question with validation.
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
     * Delete a quiz question.
     */
    public function deleteQuizQuestion(Request $request, $id)
    {
        $this->authorizeTeacher($request);

        $question = QuizQuestion::findOrFail($id);

        // Detach or nullify foreign key in student answers so attempts are never deleted
        QuizAnswer::where('question_id', $question->id)->update(['question_id' => null]);

        $question->delete();

        return response()->json(['message' => 'Matagumpay na nabura ang tanong.']);
    }

    /**
     * Upload recorded audio file from mobile device or web browser.
     */
    public function uploadAudio(Request $request)
    {
        $this->authorizeTeacher($request);

        if ($request->hasFile('audio')) {
            $request->validate([
                'audio' => 'required|file|max:20480', // 20MB max
            ]);

            $path = $request->file('audio')->store('audio', 'public');
            $storageUrl = config('app.url') . '/storage/' . $path;

            return response()->json([
                'message' => 'Matagumpay na nai-upload ang audio!',
                'path' => $path,
                'url' => $storageUrl,
            ]);
        }

        return response()->json([
            'message' => 'Walang natanggap na audio file.',
            'errors' => ['audio' => ['Kailangang mag-upload ng wastong audio file.']],
        ], 422);
    }

    /**
     * Upload image file from mobile device or web browser.
     */
    public function uploadImage(Request $request)
    {
        $this->authorizeTeacher($request);

        if ($request->hasFile('image')) {
            $request->validate([
                'image' => 'required|file|max:15360', // 15MB max
            ]);

            $path = $request->file('image')->store('images', 'public');
            // Build an absolute URL that works from both localhost web and physical mobile devices
            $storageUrl = config('app.url') . '/storage/' . $path;

            return response()->json([
                'message' => 'Matagumpay na nai-upload ang larawan!',
                'path' => $path,
                'url' => $storageUrl,
            ]);
        }

        // Support base64 image data payload if sent directly
        if ($request->filled('image_base64')) {
            $base64Data = $request->input('image_base64');
            if (preg_match('/^data:image\/(\w+);base64,/', $base64Data, $type)) {
                $base64Data = substr($base64Data, strpos($base64Data, ',') + 1);
                $type = strtolower($type[1]);
                $base64Data = base64_decode($base64Data);
                $filename = 'images/' . uniqid() . '.' . $type;
                \Illuminate\Support\Facades\Storage::disk('public')->put($filename, $base64Data);
                $url = asset('storage/' . $filename);

                return response()->json([
                    'message' => 'Matagumpay na nai-upload ang larawan!',
                    'path' => $filename,
                    'url' => $url,
                ]);
            }
        }

        return response()->json([
            'message' => 'Walang natanggap na file ng larawan.',
            'errors' => ['image' => ['Kailangang mag-upload ng wastong larawan (JPEG, PNG, WebP).']],
        ], 422);
    }

    /**
     * Approve, disable, or reactivate student account.
     */
    public function updateStudentStatus(Request $request, $id)
    {
        $this->authorizeTeacher($request);

        $validated = $request->validate([
            'status' => 'required|in:active,disabled,pending_approval',
        ]);

        $student = User::where('role', 'student')->findOrFail($id);
        $student->update(['status' => $validated['status']]);

        // If disabled, revoke active tokens and set offline
        if ($validated['status'] === 'disabled') {
            $student->tokens()->delete();
            StudentPresence::where('user_id', $student->id)->update([
                'is_online' => false,
                'current_activity' => 'Na-disable ang account',
            ]);
        }

        return response()->json([
            'message' => 'Matagumpay na na-update ang estado ng mag-aaral.',
            'student' => $student,
        ]);
    }

    /**
     * Export reports to CSV.
     * Supports type=quizzes, type=minigames, type=stars, type=students.
     */
    public function exportReportsCsv(Request $request)
    {
        $this->authorizeTeacher($request);

        $type = $request->query('type', 'quizzes');

        if ($type === 'minigames') {
            $sessions = MinigameSession::with('user:id,name,student_id_code,section')
                ->orderByDesc('created_at')
                ->get();
            $filename = 'wikaplay_minigames_report_' . date('Y-m-d') . '.csv';
            $csvHeader = ['Student ID', 'Student Name', 'Section', 'Game Type', 'Score', 'Stars Awarded', 'Date'];
            $rows = [implode(',', array_map(fn($h) => '"' . str_replace('"', '""', $h) . '"', $csvHeader))];

            foreach ($sessions as $s) {
                $row = [
                    $s->user->student_id_code ?? ('ID-' . $s->user_id),
                    $s->user->name ?? 'Unknown',
                    $s->user->section ?? 'N/A',
                    $s->game_type,
                    $s->score,
                    $s->stars_awarded,
                    $s->created_at ? $s->created_at->format('Y-m-d H:i:s') : '',
                ];
                $rows[] = implode(',', array_map(fn($val) => '"' . str_replace('"', '""', (string)$val) . '"', $row));
            }
        } elseif ($type === 'stars') {
            $txs = StarTransaction::with('user:id,name,student_id_code')
                ->orderByDesc('created_at')
                ->get();
            $filename = 'wikaplay_stars_ledger_' . date('Y-m-d') . '.csv';
            $csvHeader = ['Transaction ID', 'Student ID', 'Student Name', 'Amount', 'Balance After', 'Source Type', 'Description', 'Date'];
            $rows = [implode(',', array_map(fn($h) => '"' . str_replace('"', '""', $h) . '"', $csvHeader))];

            foreach ($txs as $t) {
                $row = [
                    $t->id,
                    $t->user->student_id_code ?? ('ID-' . $t->user_id),
                    $t->user->name ?? 'Unknown',
                    $t->amount,
                    $t->balance_after,
                    $t->source_type,
                    $t->description,
                    $t->created_at ? $t->created_at->format('Y-m-d H:i:s') : '',
                ];
                $rows[] = implode(',', array_map(fn($val) => '"' . str_replace('"', '""', (string)$val) . '"', $row));
            }
        } elseif ($type === 'students') {
            $students = User::where('role', 'student')->get();
            $filename = 'wikaplay_students_roster_' . date('Y-m-d') . '.csv';
            $csvHeader = ['Student ID', 'Name', 'Email', 'Section', 'Stars Balance', 'Status', 'Registered At'];
            $rows = [implode(',', array_map(fn($h) => '"' . str_replace('"', '""', $h) . '"', $csvHeader))];

            foreach ($students as $s) {
                $row = [
                    $s->student_id_code ?? ('ID-' . $s->id),
                    $s->name,
                    $s->email,
                    $s->section ?? 'N/A',
                    $s->stars_balance,
                    $s->status ?? 'active',
                    $s->created_at ? $s->created_at->format('Y-m-d H:i:s') : '',
                ];
                $rows[] = implode(',', array_map(fn($val) => '"' . str_replace('"', '""', (string)$val) . '"', $row));
            }
        } else {
            // Default: quizzes
            $sessions = QuizSession::with(['user:id,name,student_id_code,section', 'category:id,name'])
                ->orderByDesc('created_at')
                ->get();

            $filename = 'wikaplay_quiz_report_' . date('Y-m-d') . '.csv';
            $csvHeader = ['Student ID', 'Student Name', 'Section', 'Category', 'Difficulty', 'Score', 'Total Questions', 'Correct', 'Wrong', 'Passed', 'Date'];
            $rows = [implode(',', array_map(fn($h) => '"' . str_replace('"', '""', $h) . '"', $csvHeader))];

            foreach ($sessions as $s) {
                $row = [
                    $s->user->student_id_code ?? ('ID-' . $s->user_id),
                    $s->user->name ?? 'Unknown',
                    $s->user->section ?? 'N/A',
                    $s->category->name ?? 'N/A',
                    strtoupper($s->difficulty),
                    $s->score,
                    $s->total_questions,
                    $s->correct_count,
                    $s->wrong_count,
                    $s->passed ? 'YES' : 'NO',
                    $s->created_at ? $s->created_at->format('Y-m-d H:i:s') : '',
                ];
                $rows[] = implode(',', array_map(fn($val) => '"' . str_replace('"', '""', (string)$val) . '"', $row));
            }
        }

        $csvContent = implode("\n", $rows);

        if ($request->has('download')) {
            return response($csvContent, 200, [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            ]);
        }

        return response()->json([
            'filename' => $filename,
            'csv' => $csvContent,
            'total_records' => count($rows) - 1,
        ]);
    }
}
