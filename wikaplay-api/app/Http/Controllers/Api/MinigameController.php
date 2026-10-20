<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Flashcard;
use App\Models\MinigameSession;
use App\Models\StarTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MinigameController extends Controller
{
    /**
     * List mini-games with metadata and cover image references.
     */
    public function index()
    {
        $games = [
            [
                'id' => 'memory_match',
                'slug' => 'memory-match',
                'title' => 'Memory Match',
                'description' => 'Ipares ang magkakatulad na larawan ng mga salita!',
                'cover_image' => 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=400&q=80',
                'bg_color' => '#10B981', // Emerald
                'tag' => 'Pares-pares',
            ],
            [
                'id' => 'paghahanap_larawan',
                'slug' => 'paghahanap-ng-larawan',
                'title' => 'Paghahanap ng Larawan',
                'description' => 'Makinig nang mabuti at hanapin ang tamang larawan!',
                'cover_image' => 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400&q=80',
                'bg_color' => '#F59E0B', // Amber
                'tag' => 'Makinig at Hanapin',
            ],
            [
                'id' => 'hulaan_salita',
                'slug' => 'hulaan-ang-salita',
                'title' => 'Hulaan ang Salita',
                'description' => 'Tingnan ang pahiwatig at hulaan ang wastong salitang Filipino!',
                'cover_image' => 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&q=80',
                'bg_color' => '#3B82F6', // Blue
                'tag' => 'Talas ng Isip',
            ],
            [
                'id' => 'gulong_letra',
                'slug' => 'gulong-ng-mga-letra',
                'title' => 'Gulong ng mga Letra',
                'description' => 'Ayusin ang mga letra upang mabuo ang salita!',
                'cover_image' => 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=400&q=80',
                'bg_color' => '#8B5CF6', // Purple
                'tag' => 'Ayusin ang Letra',
            ],
            [
                'id' => 'pop_balloon',
                'slug' => 'pop-balloon',
                'title' => 'Pop Balloon',
                'description' => 'Paputukin ang tamang lobo na nagtataglay ng tamang sagot!',
                'cover_image' => 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400&q=80',
                'bg_color' => '#EC4899', // Pink
                'tag' => 'Masayang Laro',
            ],
        ];

        return response()->json(['games' => $games]);
    }

    /**
     * Get dynamic content for a mini-game based on published flashcards.
     */
    public function getContent($gameType)
    {
        $flashcards = Flashcard::where('is_published', true)
            ->with('category:id,name,color')
            ->inRandomOrder()
            ->limit(12)
            ->get();

        return response()->json([
            'game_type' => $gameType,
            'items' => $flashcards,
        ]);
    }

    /**
     * Submit completed mini-game results.
     */
    public function submit(Request $request)
    {
        $validated = $request->validate([
            'game_type' => 'required|string',
            'score' => 'required|integer|min:0',
            'duration_seconds' => 'nullable|integer|min:0',
            'metadata' => 'nullable|array',
        ]);

        $user = $request->user();

        return DB::transaction(function () use ($user, $validated) {
            // Stars awarded based on score: 1 star per 50 points (min 1, max 10)
            $score = $validated['score'];
            $starsAwarded = min(10, max(1, (int)floor($score / 50)));

            $session = MinigameSession::create([
                'user_id' => $user->id,
                'game_type' => $validated['game_type'],
                'score' => $score,
                'duration_seconds' => $validated['duration_seconds'] ?? 0,
                'stars_awarded' => $starsAwarded,
                'metadata' => $validated['metadata'] ?? null,
            ]);

            $user->increment('stars_balance', $starsAwarded);
            $newBalance = $user->fresh()->stars_balance;

            StarTransaction::create([
                'user_id' => $user->id,
                'amount' => $starsAwarded,
                'balance_after' => $newBalance,
                'source_type' => 'minigame_session',
                'source_id' => $session->id,
                'description' => "Nilaro ang {$validated['game_type']}",
            ]);

            return response()->json([
                'message' => 'Napakasayang maglaro! Nakaipon ka ng mga bituin!',
                'session' => [
                    'id' => $session->id,
                    'score' => $score,
                    'stars_awarded' => $starsAwarded,
                    'stars_balance' => $newBalance,
                ],
            ]);
        });
    }
}
