<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\MinigameSession;
use App\Models\QuizAnswer;
use App\Models\QuizSession;
use App\Models\StarTransaction;
use App\Models\StudentBadge;
use App\Models\StudentCollectible;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class StudentProfileController extends Controller
{
    /**
     * Standard Badges Catalog with configured thresholds.
     */
    public const BADGES_CATALOG = [
        [
            'key' => 'first_star',
            'title' => 'First Star',
            'filipino_title' => 'Unang Bituin',
            'threshold' => 10,
            'icon' => '🌱',
            'description' => 'Makaipon ng 10 bituin - Simula ng isang bagong paglalakbay!',
        ],
        [
            'key' => 'star_collector',
            'title' => 'Star Collector',
            'filipino_title' => 'Kolektor ng Bituin',
            'threshold' => 50,
            'icon' => '⭐',
            'description' => 'Makaipon ng 50 na kabuuang bituin.',
        ],
        [
            'key' => 'super_learner',
            'title' => 'Super Learner',
            'filipino_title' => 'Super Mag-aaral',
            'threshold' => 100,
            'icon' => '🌟',
            'description' => 'Makaipon ng 100 na kabuuang bituin.',
        ],
        [
            'key' => 'bookworm',
            'title' => 'Bookworm',
            'filipino_title' => 'Mahilig Magbasa',
            'threshold' => 150,
            'icon' => '📚',
            'description' => 'Patunay na masipag kang matuto — 150 bituin na!',
        ],
        [
            'key' => 'quiz_master',
            'title' => 'Quiz Master',
            'filipino_title' => 'Dalubhasa sa Pagsusulit',
            'threshold' => 200,
            'icon' => '🎯',
            'description' => 'Makaipon ng 200 na kabuuang bituin.',
        ],
        [
            'key' => 'rising_star',
            'title' => 'Rising Star',
            'filipino_title' => 'Papasikat na Bituin',
            'threshold' => 250,
            'icon' => '🚀',
            'description' => 'Ika-250 na bituin — patuloy kang lumalayo sa iba!',
        ],
        [
            'key' => 'learning_champion',
            'title' => 'Learning Champion',
            'filipino_title' => 'Kampeon ng Karunungan',
            'threshold' => 300,
            'icon' => '🏆',
            'description' => 'Makaipon ng 300 na kabuuang bituin.',
        ],
        [
            'key' => 'word_wizard',
            'title' => 'Word Wizard',
            'filipino_title' => 'Salamangkero ng Salita',
            'threshold' => 360,
            'icon' => '🪄',
            'description' => '360 bituin — talagang mahusay ka sa mga salita!',
        ],
        [
            'key' => 'ultimate_learner',
            'title' => 'Ultimate Learner',
            'filipino_title' => 'Tunay na Henyo ng WikaPlay',
            'threshold' => 480,
            'icon' => '👑',
            'description' => 'Makaipon ng 480 na kabuuang bituin (Lahat ng kategorya).',
        ],
        [
            'key' => 'knowledge_seeker',
            'title' => 'Knowledge Seeker',
            'filipino_title' => 'Tagahangad ng Kaalaman',
            'threshold' => 600,
            'icon' => '🔭',
            'description' => '600 bituin — walang tigil sa paghahanap ng kaalaman!',
        ],
        [
            'key' => 'legend',
            'title' => 'Legend',
            'filipino_title' => 'Alamat ng WikaPlay',
            'threshold' => 750,
            'icon' => '🦅',
            'description' => '750 bituin — tunay kang alamat sa WikaPlay!',
        ],
        [
            'key' => 'grandmaster',
            'title' => 'Grand Master',
            'filipino_title' => 'Pinakadakilang Henyo',
            'threshold' => 900,
            'icon' => '💎',
            'description' => '900 bituin — isa sa pinaka-marunong sa lahat!',
        ],
        [
            'key' => 'wika_hero',
            'title' => 'Wika Hero',
            'filipino_title' => 'Bayani ng Wika',
            'threshold' => 1100,
            'icon' => '🦸',
            'description' => '1100 bituin — Bayani ka ng wikang Filipino!',
        ],
        [
            'key' => 'galaxy_brain',
            'title' => 'Galaxy Brain',
            'filipino_title' => 'Galaktikong Isipan',
            'threshold' => 1350,
            'icon' => '🌌',
            'description' => '1350 bituin — katalinuhan mo ay para sa buong galaksya!',
        ],
        [
            'key' => 'immortal_scholar',
            'title' => 'Immortal Scholar',
            'filipino_title' => 'Walang Hanggang Iskolar',
            'threshold' => 1650,
            'icon' => '🏛️',
            'description' => '1650 bituin — ang iyong pangalan ay titik sa kasaysayan ng WikaPlay!',
        ],
    ];


    /**
     * Comprehensive Student Profile & Learning Statistics.
     */
    public function profileStats(Request $request)
    {
        $user = $request->user();

        // 1. Star aggregates
        $lifetimeStars = (int) StarTransaction::where('user_id', $user->id)
            ->where('amount', '>', 0)
            ->sum('amount');
        $starsSpent = abs((int) StarTransaction::where('user_id', $user->id)
            ->where('amount', '<', 0)
            ->sum('amount'));
        $spendableBalance = $user->stars_balance;

        // 2. Quiz and Minigame Session totals
        $quizSessionsCount = QuizSession::where('user_id', $user->id)->count();
        $minigameSessionsCount = MinigameSession::where('user_id', $user->id)->count();
        $totalSessions = $quizSessionsCount + $minigameSessionsCount;

        // 3. Question-level statistics
        $userQuizSessionIds = QuizSession::where('user_id', $user->id)->pluck('id');
        $totalAnswered = QuizAnswer::whereIn('quiz_session_id', $userQuizSessionIds)->count();
        $correctAnswers = QuizAnswer::whereIn('quiz_session_id', $userQuizSessionIds)
            ->where('is_correct', true)
            ->count();
        $wrongAnswers = QuizAnswer::whereIn('quiz_session_id', $userQuizSessionIds)
            ->where('is_correct', false)
            ->count();

        $overallAccuracy = $totalAnswered > 0
            ? round(($correctAnswers / $totalAnswered) * 100)
            : 0;

        // 4. Collectibles
        $collectiblesOwned = StudentCollectible::where('user_id', $user->id)->count();
        $totalCollectibles = 151;

        // 5. Badges status & claiming
        $claimedBadges = StudentBadge::where('user_id', $user->id)->get()->keyBy('badge_key');
        $badgeList = [];
        $highestUnlockedBadge = null;

        foreach (self::BADGES_CATALOG as $badge) {
            $isUnlocked = ($lifetimeStars >= $badge['threshold']);
            $claimRecord = $claimedBadges->get($badge['key']);
            $isClaimed = $claimRecord && !is_null($claimRecord->claimed_at);

            $status = 'locked';
            if ($isClaimed) {
                $status = 'claimed';
            } elseif ($isUnlocked) {
                $status = 'unlocked';
            }

            if ($isUnlocked) {
                $highestUnlockedBadge = $badge['filipino_title'];
            }

            $badgeList[] = [
                'key' => $badge['key'],
                'title' => $badge['title'],
                'filipino_title' => $badge['filipino_title'],
                'threshold' => $badge['threshold'],
                'icon' => $badge['icon'],
                'description' => $badge['description'],
                'status' => $status,
                'unlocked_at' => $isUnlocked ? ($claimRecord?->unlocked_at ?? now()->toISOString()) : null,
                'claimed_at' => $claimRecord?->claimed_at?->toISOString(),
            ];
        }

        // Current learning level (1 to 10 based on stars)
        $level = min(10, max(1, (int) floor($lifetimeStars / 48) + 1));

        // 6. Mini-game personal bests
        $gameTypes = ['memory_match', 'paghahanap_larawan', 'hulaan_salita', 'gulong_letra', 'pop_balloon'];
        $personalBests = [];
        foreach ($gameTypes as $gt) {
            $maxScore = MinigameSession::where('user_id', $user->id)
                ->where('game_type', $gt)
                ->max('score');
            $personalBests[$gt] = $maxScore !== null ? (int) $maxScore : 0;
        }

        // 7. Category-by-category progress
        $categories = [
            ['id' => 1, 'slug' => 'mga-hayop', 'name' => 'Mga Hayop', 'icon' => '🐾', 'color' => '#10B981'],
            ['id' => 2, 'slug' => 'mga-prutas', 'name' => 'Mga Prutas', 'icon' => '🍎', 'color' => '#F59E0B'],
            ['id' => 3, 'slug' => 'mga-gulay', 'name' => 'Mga Gulay', 'icon' => '🥕', 'color' => '#84CC16'],
            ['id' => 4, 'slug' => 'mga-bilang', 'name' => 'Mga Bilang', 'icon' => '🔢', 'color' => '#06B6D4'],
            ['id' => 5, 'slug' => 'mga-hugis', 'name' => 'Mga Hugis', 'icon' => '🔷', 'color' => '#8B5CF6'],
            ['id' => 6, 'slug' => 'mga-kulay', 'name' => 'Mga Kulay', 'icon' => '🎨', 'color' => '#EC4899'],
            ['id' => 7, 'slug' => 'bahagi-ng-katawan', 'name' => 'Bahagi ng Katawan', 'icon' => '👤', 'color' => '#3B82F6'],
            ['id' => 8, 'slug' => 'mga-pagbati', 'name' => 'Mga Pagbati', 'icon' => '👋', 'color' => '#14B8A6'],
        ];

        $categoryProgress = [];
        $categoriesPracticedCount = 0;

        foreach ($categories as $cat) {
            // Stars earned in this category (quizzes)
            $catSessions = QuizSession::where('user_id', $user->id)
                ->where('category_id', $cat['id'])
                ->get();

            $catStars = min(60, (int) $catSessions->sum('stars_awarded'));
            $catAttempts = $catSessions->count();

            if ($catAttempts > 0) {
                $categoriesPracticedCount++;
            }

            // Accuracy for category
            $catSessionIds = $catSessions->pluck('id');
            $catTotal = QuizAnswer::whereIn('quiz_session_id', $catSessionIds)->count();
            $catCorrect = QuizAnswer::whereIn('quiz_session_id', $catSessionIds)->where('is_correct', true)->count();
            $catAccuracy = $catTotal > 0 ? round(($catCorrect / $catTotal) * 100) : 0;
            $bestScore = $catSessions->max('score') ?? 0;

            $categoryProgress[] = [
                'id' => $cat['id'],
                'slug' => $cat['slug'],
                'name' => $cat['name'],
                'icon' => $cat['icon'],
                'color' => $cat['color'],
                'stars_earned' => $catStars,
                'max_stars' => 60,
                'attempts' => $catAttempts,
                'accuracy' => $catAccuracy,
                'best_score' => (int) $bestScore,
                'suggested_activity' => $catStars < 60 ? 'Magsanay sa Madali o Katamtaman' : 'Maglaro ng Mini-Game',
            ];
        }

        // 8. Recent activity (last 10 sessions)
        $recentQuizzes = QuizSession::where('user_id', $user->id)
            ->latest('created_at')
            ->limit(10)
            ->get()
            ->map(function ($s) use ($categories) {
                $catName = 'Pagsusulit';
                foreach ($categories as $c) {
                    if ($c['id'] == $s->category_id) {
                        $catName = $c['name'];
                        break;
                    }
                }
                return [
                    'id' => 'quiz_' . $s->id,
                    'type' => 'quiz',
                    'title' => "Pagsusulit ({$s->difficulty})",
                    'category' => $catName,
                    'score' => $s->score . '/' . max(1, $s->total_questions),
                    'stars_awarded' => $s->stars_awarded,
                    'completed_at' => $s->created_at->toISOString(),
                    'created_at_human' => $s->created_at->diffForHumans(),
                ];
            });

        $recentMinigames = MinigameSession::where('user_id', $user->id)
            ->latest('created_at')
            ->limit(10)
            ->get()
            ->map(function ($s) {
                $meta = is_array($s->metadata) ? $s->metadata : json_decode($s->metadata, true);
                $gameNames = [
                    'memory_match' => 'Memory Match',
                    'paghahanap_larawan' => 'Paghahanap ng Larawan',
                    'hulaan_salita' => 'Hulaan ang Salita',
                    'gulong_letra' => 'Gulong ng mga Letra',
                    'pop_balloon' => 'Pop Balloon',
                ];
                return [
                    'id' => 'minigame_' . $s->id,
                    'type' => 'minigame',
                    'title' => $gameNames[$s->game_type] ?? 'Mini-Game',
                    'category' => $meta['category'] ?? 'Laro',
                    'score' => $s->score . '/20',
                    'stars_awarded' => $s->stars_awarded,
                    'completed_at' => $s->created_at->toISOString(),
                    'created_at_human' => $s->created_at->diffForHumans(),
                ];
            });

        $recentActivities = $recentQuizzes->concat($recentMinigames)
            ->sortByDesc('completed_at')
            ->values()
            ->take(10);

        // 9. Personal improvement encouragement text
        $encouragement = 'Maligayang pag-aaral! Mag-umpisang magsagot ng mga pagsusulit o maglaro ng mga mini-game! 🚀';
        if ($totalSessions > 0) {
            if ($overallAccuracy >= 80) {
                $encouragement = 'Napakagaling! Napakataas ng iyong marka at katumpakan! Tuloy lang sa pag-aaral! 🌟';
            } elseif ($categoriesPracticedCount >= 5) {
                $encouragement = 'Kamangha-mangha! Marami ka nang natutunang iba\'t ibang kategorya! 🏆';
            } else {
                $encouragement = 'Magaling! Mas marami ka nang nasasagot nang tama. Subukan ang iba pang mga kategorya! 💪';
            }
        }

        return response()->json([
            'user' => [
                'id' => $user->id,
                'student_id_code' => $user->student_id_code,
                'name' => $user->name,
                'avatar' => $user->avatar,
                'section' => $user->section,
                'level' => $level,
                'current_badge' => $highestUnlockedBadge ?: 'Bagong Mag-aaral',
            ],
            'stats' => [
                'lifetime_stars' => $lifetimeStars,
                'spendable_stars' => $spendableBalance,
                'spent_stars' => $starsSpent,
                'total_sessions' => $totalSessions,
                'quizzes_completed' => $quizSessionsCount,
                'minigames_completed' => $minigameSessionsCount,
                'total_questions_answered' => $totalAnswered,
                'correct_answers' => $correctAnswers,
                'wrong_answers' => $wrongAnswers,
                'overall_accuracy' => $overallAccuracy,
                'collectibles_owned' => $collectiblesOwned,
                'total_collectibles' => $totalCollectibles,
                'badges_earned_count' => collect($badgeList)->whereIn('status', ['unlocked', 'claimed'])->count(),
                'categories_practiced_count' => $categoriesPracticedCount,
                'personal_bests' => $personalBests,
            ],
            'category_progress' => $categoryProgress,
            'badges' => $badgeList,
            'recent_activities' => $recentActivities,
            'encouragement' => $encouragement,
        ]);
    }

    /**
     * Update Student Avatar selection safely.
     */
    public function updateAvatar(Request $request)
    {
        $validated = $request->validate([
            'avatar' => 'required|string|max:65535',
        ]);

        $user = $request->user();
        $user->avatar = $validated['avatar'];
        $user->save();

        return response()->json([
            'message' => 'Matagumpay na napalitan ang iyong avatar!',
            'avatar' => $user->avatar,
        ]);
    }
}
