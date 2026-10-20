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
                'description' => $isUnlocked ? $c->description : 'Mahiwagang Gantimpala! I-unlock gamit ang iyong mga bituin.',
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

        $transactions = StarTransaction::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json([
            'stars_balance' => $user->stars_balance,
            'history' => $transactions,
        ]);
    }
}
