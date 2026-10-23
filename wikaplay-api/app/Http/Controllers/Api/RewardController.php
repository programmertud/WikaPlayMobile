<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Collectible;
use App\Models\StarTransaction;
use App\Models\StudentCollectible;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RewardController extends Controller
{
    /**
     * Get all collectibles with unlock status for the student (Nakolekta).
     */
    public function collectibles(Request $request)
    {
        $user = $request->user();

        $collectibles = Collectible::all();
        $unlockedMap = StudentCollectible::where('user_id', $user->id)
            ->get()
            ->keyBy('collectible_id');

        $data = $collectibles->map(function ($c) use ($unlockedMap) {
            $pivot = $unlockedMap->get($c->id);
            $isUnlocked = !is_null($pivot);

            return [
                'id' => $c->id,
                'slug' => $c->slug,
                'name' => $c->name,
                'filipino_name' => $c->filipino_name,
                'category' => $c->category ?: 'Mga Hayop',
                'description' => $isUnlocked ? $c->description : 'Mahiwagang Gantimpala! I-unlock gamit ang iyong mga bituin o maglaro ng mini-game!',
                'image_url' => $isUnlocked ? $c->image_url : null,
                'audio_url' => $isUnlocked ? $c->audio_url : null,
                'rarity' => $c->rarity,
                'required_stars' => $c->required_stars,
                'is_unlocked' => $isUnlocked,
                'unlocked_at' => $pivot ? $pivot->unlocked_at->toISOString() : null,
            ];
        });

        return response()->json([
            'collectibles' => $data,
            'stars_balance' => $user->stars_balance,
            'total_unlocked' => $unlockedMap->count(),
            'total_available' => $collectibles->count(),
        ]);
    }

    /**
     * Unlock a mystery collectible using stars (Gantimpala mystery reward reveal).
     */
    public function unlockMystery(Request $request)
    {
        $user = $request->user();

        return DB::transaction(function () use ($user) {
            $alreadyUnlockedIds = StudentCollectible::where('user_id', $user->id)->pluck('collectible_id');

            // Find a locked collectible
            $availableToUnlock = Collectible::whereNotIn('id', $alreadyUnlockedIds)->get();

            if ($availableToUnlock->isEmpty()) {
                return response()->json([
                    'message' => 'Nakuha mo na ang lahat ng mahiwagang gantimpala! Napakagaling!',
                    'all_unlocked' => true,
                ], 200);
            }

            // Pick one randomly or by cost
            $toUnlock = $availableToUnlock->random();
            $cost = $toUnlock->required_stars;

            if ($user->stars_balance < $cost) {
                return response()->json([
                    'message' => "Kailangan mo ng {$cost} bituin upang buksan ang mahiwagang gantimpala.",
                    'required_stars' => $cost,
                    'current_stars' => $user->stars_balance,
                ], 422);
            }

            // Deduct stars
            $user->decrement('stars_balance', $cost);
            $newBalance = $user->fresh()->stars_balance;

            StudentCollectible::create([
                'user_id' => $user->id,
                'collectible_id' => $toUnlock->id,
                'unlocked_at' => now(),
                'is_mystery_revealed' => true,
            ]);

            StarTransaction::create([
                'user_id' => $user->id,
                'amount' => -$cost,
                'balance_after' => $newBalance,
                'source_type' => 'reward_claim',
                'source_id' => $toUnlock->id,
                'description' => "Binuksan ang gantimpalang: {$toUnlock->filipino_name}",
            ]);

            return response()->json([
                'message' => 'Binabati kita! May bago kang gantimpala sa iyong koleksyon!',
                'collectible' => [
                    'id' => $toUnlock->id,
                    'slug' => $toUnlock->slug,
                    'name' => $toUnlock->name,
                    'filipino_name' => $toUnlock->filipino_name,
                    'description' => $toUnlock->description,
                    'image_url' => $toUnlock->image_url,
                    'audio_url' => $toUnlock->audio_url,
                    'rarity' => $toUnlock->rarity,
                ],
                'stars_balance' => $newBalance,
            ]);
        });
    }

    /**
     * Get star transactions ledger history.
     */
    public function starsHistory(Request $request)
    {
        $user = $request->user();

        $totalEarned = (int) StarTransaction::where('user_id', $user->id)->where('amount', '>', 0)->sum('amount');
        $totalSpent = abs((int) StarTransaction::where('user_id', $user->id)->where('amount', '<', 0)->sum('amount'));

        $transactions = StarTransaction::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->paginate(30);

        return response()->json([
            'stars_balance' => $user->stars_balance,
            'total_earned' => $totalEarned,
            'total_spent' => $totalSpent,
            'history' => $transactions,
        ]);
    }

    /**
     * Get Gantimpala Center achievements, badges, missions, and ledger balances.
     */
    public function achievements(Request $request)
    {
        $user = $request->user();

        $lifetimeStars = (int) StarTransaction::where('user_id', $user->id)->where('amount', '>', 0)->sum('amount');
        $totalSpent = abs((int) StarTransaction::where('user_id', $user->id)->where('amount', '<', 0)->sum('amount'));
        $spendableStars = $user->stars_balance;

        $badgesCatalog = StudentProfileController::BADGES_CATALOG;
        $claimedMap = \App\Models\StudentBadge::where('user_id', $user->id)->get()->keyBy('badge_key');

        $badges = [];
        $nextMilestone = null;
        $currentMilestone = null;

        foreach ($badgesCatalog as $b) {
            $isUnlocked = ($lifetimeStars >= $b['threshold']);
            $claim = $claimedMap->get($b['key']);
            $isClaimed = $claim && !is_null($claim->claimed_at);

            $status = 'locked';
            if ($isClaimed) {
                $status = 'claimed';
                $currentMilestone = $b;
            } elseif ($isUnlocked) {
                $status = 'unlocked';
                $currentMilestone = $b;
            } elseif (!$nextMilestone) {
                $nextMilestone = $b;
            }

            $badges[] = [
                'key' => $b['key'],
                'title' => $b['title'],
                'filipino_title' => $b['filipino_title'],
                'threshold' => $b['threshold'],
                'icon' => $b['icon'],
                'description' => $b['description'],
                'status' => $status,
                'claimed_at' => $claim?->claimed_at?->toISOString(),
            ];
        }

        // Calculate progress to next milestone
        $prevThreshold = $currentMilestone ? $currentMilestone['threshold'] : 0;
        $nextThreshold = $nextMilestone ? $nextMilestone['threshold'] : 480;
        $progressPct = 100;
        if ($nextMilestone) {
            $range = max(1, $nextThreshold - $prevThreshold);
            $earnedInRange = max(0, min($range, $lifetimeStars - $prevThreshold));
            $progressPct = round(($earnedInRange / $range) * 100);
        }

        // Daily & Weekly Missions (Dynamic from activity today / this week)
        $today = now()->startOfDay();
        $startOfWeek = now()->startOfWeek();

        // 1. Questions answered today
        $userSessionIdsToday = \App\Models\QuizSession::where('user_id', $user->id)
            ->where('created_at', '>=', $today)
            ->pluck('id');
        $questionsToday = \App\Models\QuizAnswer::whereIn('quiz_session_id', $userSessionIdsToday)->count();

        // 2. Minigames played today
        $minigamesToday = \App\Models\MinigameSession::where('user_id', $user->id)
            ->where('created_at', '>=', $today)
            ->count();

        // 3. Hayop sessions today
        $hayopSessionsToday = \App\Models\QuizSession::where('user_id', $user->id)
            ->where('category_id', 1)
            ->where('created_at', '>=', $today)
            ->count();

        // 4. Categories practiced this week
        $weeklyCategoriesCount = \App\Models\QuizSession::where('user_id', $user->id)
            ->where('created_at', '>=', $startOfWeek)
            ->distinct('category_id')
            ->count('category_id');

        $missions = [
            [
                'id' => 'm_daily_quiz_5',
                'type' => 'daily',
                'title' => 'Sagutin ang 5 Tanong',
                'description' => 'Magsagot ng 5 tanong sa anumang pagsusulit ngayong araw.',
                'progress' => min(5, $questionsToday),
                'target' => 5,
                'is_completed' => ($questionsToday >= 5),
                'reward_label' => 'Tagumpay! 🎯',
            ],
            [
                'id' => 'm_daily_minigame',
                'type' => 'daily',
                'title' => 'Maglaro ng Isang Mini-Game',
                'description' => 'Subukan ang anumang masayang mini-game ngayong araw.',
                'progress' => min(1, $minigamesToday),
                'target' => 1,
                'is_completed' => ($minigamesToday >= 1),
                'reward_label' => 'Magaling! 🎮',
            ],
            [
                'id' => 'm_daily_hayop',
                'type' => 'daily',
                'title' => 'Magsanay sa Mga Hayop',
                'description' => 'Tapusin ang isang sesyon ng pag-aaral sa Mga Hayop.',
                'progress' => min(1, $hayopSessionsToday),
                'target' => 1,
                'is_completed' => ($hayopSessionsToday >= 1),
                'reward_label' => 'Natapos! 🐾',
            ],
            [
                'id' => 'm_weekly_categories',
                'type' => 'weekly',
                'title' => 'Subukan ang 3 Kategorya',
                'description' => 'Magsanay sa 3 magkakaibang paksa ngayong linggo.',
                'progress' => min(3, $weeklyCategoriesCount),
                'target' => 3,
                'is_completed' => ($weeklyCategoriesCount >= 3),
                'reward_label' => 'Super Star! 🌟',
            ],
        ];

        // Recent star transactions (last 6)
        $recentTransactions = StarTransaction::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->limit(6)
            ->get()
            ->map(function ($t) {
                return [
                    'id' => $t->id,
                    'amount' => $t->amount,
                    'description' => $t->description ?: ($t->amount > 0 ? 'Nakamit na Bituin' : 'Nagamit na Bituin'),
                    'balance_after' => $t->balance_after,
                    'created_at' => $t->created_at->toISOString(),
                    'created_at_human' => $t->created_at->diffForHumans(),
                ];
            });

        return response()->json([
            'stars_balance' => $spendableStars,
            'lifetime_stars' => $lifetimeStars,
            'spent_stars' => $totalSpent,
            'current_milestone' => $currentMilestone,
            'next_milestone' => $nextMilestone,
            'milestone_progress_pct' => $progressPct,
            'badges' => $badges,
            'missions' => $missions,
            'recent_rewards' => $recentTransactions,
        ]);
    }

    /**
     * Claim an unlocked achievement badge.
     */
    public function claimBadge(Request $request)
    {
        $validated = $request->validate([
            'badge_key' => 'required|string',
        ]);

        $user = $request->user();
        $badgeKey = $validated['badge_key'];

        $catalogItem = null;
        foreach (StudentProfileController::BADGES_CATALOG as $b) {
            if ($b['key'] === $badgeKey) {
                $catalogItem = $b;
                break;
            }
        }

        if (!$catalogItem) {
            return response()->json(['message' => 'Hindi kilalang badge.'], 404);
        }

        $lifetimeStars = (int) StarTransaction::where('user_id', $user->id)->where('amount', '>', 0)->sum('amount');
        if ($lifetimeStars < $catalogItem['threshold']) {
            return response()->json([
                'message' => "Kailangan mo ng {$catalogItem['threshold']} na bituin upang makuha ang badge na ito.",
            ], 422);
        }

        $badge = \App\Models\StudentBadge::updateOrCreate(
            ['user_id' => $user->id, 'badge_key' => $badgeKey],
            [
                'threshold' => $catalogItem['threshold'],
                'unlocked_at' => now(),
                'claimed_at' => now(),
            ]
        );

        return response()->json([
            'message' => "Binabati kita! Matagumpay mong na-claim ang '{$catalogItem['filipino_title']}'! 🎉",
            'badge' => [
                'key' => $badge->badge_key,
                'title' => $catalogItem['title'],
                'filipino_title' => $catalogItem['filipino_title'],
                'status' => 'claimed',
                'claimed_at' => $badge->claimed_at->toISOString(),
            ],
        ]);
    }
}
