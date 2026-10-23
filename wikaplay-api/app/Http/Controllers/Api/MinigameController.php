<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Collectible;
use App\Models\Flashcard;
use App\Models\MinigameSession;
use App\Models\StarTransaction;
use App\Models\StudentCollectible;
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
                'bg_color' => '#10B981',
                'tag' => 'Pares-pares',
            ],
            [
                'id' => 'paghahanap_larawan',
                'slug' => 'paghahanap-ng-larawan',
                'title' => 'Paghahanap ng Larawan',
                'description' => 'Makinig nang mabuti at hanapin ang tamang larawan!',
                'cover_image' => 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400&q=80',
                'bg_color' => '#F59E0B',
                'tag' => 'Makinig at Hanapin',
            ],
            [
                'id' => 'hulaan_salita',
                'slug' => 'hulaan-ang-salita',
                'title' => 'Hulaan ang Salita',
                'description' => 'Tingnan ang pahiwatig at hulaan ang wastong salitang Filipino!',
                'cover_image' => 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&q=80',
                'bg_color' => '#3B82F6',
                'tag' => 'Talas ng Isip',
            ],
            [
                'id' => 'gulong_letra',
                'slug' => 'gulong-ng-mga-letra',
                'title' => 'Gulong ng mga Letra',
                'description' => 'Ayusin ang mga letra upang mabuo ang salita!',
                'cover_image' => 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=400&q=80',
                'bg_color' => '#8B5CF6',
                'tag' => 'Ayusin ang Letra',
            ],
            [
                'id' => 'pop_balloon',
                'slug' => 'pop-balloon',
                'title' => 'Pop Balloon',
                'description' => 'Paputukin ang tamang lobo na nagtataglay ng tamang sagot!',
                'cover_image' => 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400&q=80',
                'bg_color' => '#EC4899',
                'tag' => 'Masayang Laro',
            ],
        ];

        return response()->json(['games' => $games]);
    }

    /**
     * Get dynamic content for a mini-game based on published flashcards (up to 20 items).
     */
    public function getContent($gameType)
    {
        $flashcards = Flashcard::where('is_published', true)
            ->with('category:id,name,color')
            ->inRandomOrder()
            ->limit(20)
            ->get();

        return response()->json([
            'game_type' => $gameType,
            'items' => $flashcards,
        ]);
    }

    /**
     * Submit completed mini-game results with strict 1:1 star updates,
     * duplicate prevention, and mystery box collectible qualification for 15-20/20 scores.
     */
    public function submit(Request $request)
    {
        $validated = $request->validate([
            'game_type' => 'required|string',
            'score' => 'required|integer|min:0|max:20',
            'session_id' => 'nullable|string',
            'duration_seconds' => 'nullable|integer|min:0',
            'metadata' => 'nullable|array',
        ]);

        $user = $request->user() ?? auth()->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }
        $sessionId = $validated['session_id'] ?? null;

        // 1. Duplicate check: Prevent duplicate awards for the same session (repeat submissions / network retry)
        if ($sessionId) {
            $existing = MinigameSession::where('session_id', $sessionId)
                ->where('user_id', $user->id)
                ->first();

            if ($existing) {
                $meta = is_array($existing->metadata) ? $existing->metadata : json_decode($existing->metadata, true);
                $collectible = null;
                if (!empty($meta['collectible_id'])) {
                    $collectible = Collectible::find($meta['collectible_id']);
                }

                return response()->json([
                    'message' => 'Nai-record na ang larong ito dati.',
                    'is_duplicate_submission' => true,
                    'session' => [
                        'id' => $existing->id,
                        'session_id' => $existing->session_id,
                        'score' => $existing->score,
                        'total_levels' => 20,
                        'stars_awarded' => $existing->stars_awarded,
                        'stars_balance' => $user->stars_balance,
                        'qualifies_for_collectible' => $meta['qualifies_for_collectible'] ?? false,
                        'collectible' => $collectible ? [
                            'id' => $collectible->id,
                            'slug' => $collectible->slug,
                            'name' => $collectible->name,
                            'filipino_name' => $collectible->filipino_name,
                            'category' => $collectible->category ?: 'Mga Hayop',
                            'description' => $collectible->description,
                            'image_url' => $collectible->image_url,
                            'audio_url' => $collectible->audio_url,
                            'rarity' => $collectible->rarity,
                            'is_duplicate' => $meta['is_duplicate'] ?? false,
                        ] : null,
                    ],
                ]);
            }
        }

        return DB::transaction(function () use ($user, $validated, $sessionId) {
            $score = $validated['score']; // 0 to 20

            // Rule: Strict 1:1 star balance update: earning 20 stars adds exactly 20 stars, never 100
            $starsAwarded = min(20, max(0, $score));

            // Rule: Qualification for collectible card: 15-20 out of 20 qualifies; 0-14 does NOT grant collectible
            $qualifiesForCollectible = ($score >= 15 && $score <= 20);
            $awardedCollectible = null;
            $isDuplicateCard = false;

            if ($qualifiesForCollectible) {
                // Determine category from metadata (e.g., mga-hayop -> Mga Hayop)
                $meta = $validated['metadata'] ?? [];
                $categorySlugOrName = $meta['category'] ?? $meta['category_slug'] ?? $meta['category_name'] ?? null;
                $targetCategory = $this->resolveCategoryName($categorySlugOrName);

                // Find unowned collectibles for this student
                $ownedIds = StudentCollectible::where('user_id', $user->id)->pluck('collectible_id');

                // 1. Primary: Find unowned collectibles in the played category
                $categoryQuery = Collectible::whereNotIn('id', $ownedIds);
                if ($targetCategory) {
                    $categoryQuery->where('category', $targetCategory);
                }
                $unownedList = $categoryQuery->get();

                // 2. If student has unowned collectibles in this category, award one
                if ($unownedList->isNotEmpty()) {
                    $chosen = $unownedList->random();
                    StudentCollectible::create([
                        'user_id' => $user->id,
                        'collectible_id' => $chosen->id,
                        'unlocked_at' => now(),
                        'is_mystery_revealed' => true,
                    ]);
                    $awardedCollectible = $chosen;
                    $isDuplicateCard = false;
                } else {
                    // All cards in this category collected.
                    // Fallback A: Check if unowned cards exist in other categories
                    $anyUnowned = Collectible::whereNotIn('id', $ownedIds)->get();
                    if ($anyUnowned->isNotEmpty()) {
                        $chosen = $anyUnowned->random();
                        StudentCollectible::create([
                            'user_id' => $user->id,
                            'collectible_id' => $chosen->id,
                            'unlocked_at' => now(),
                            'is_mystery_revealed' => true,
                        ]);
                        $awardedCollectible = $chosen;
                        $isDuplicateCard = false;
                    } else {
                        // All 151 cards unlocked! Award duplicate card
                        $dupQuery = Collectible::query();
                        if ($targetCategory) {
                            $dupQuery->where('category', $targetCategory);
                        }
                        $chosen = $dupQuery->inRandomOrder()->first() ?? Collectible::inRandomOrder()->first();
                        $awardedCollectible = $chosen;
                        $isDuplicateCard = true;
                    }
                }
            }

            // Create persistent session
            $session = MinigameSession::create([
                'user_id' => $user->id,
                'session_id' => $sessionId,
                'game_type' => $validated['game_type'],
                'score' => $score,
                'duration_seconds' => $validated['duration_seconds'] ?? 0,
                'stars_awarded' => $starsAwarded,
                'metadata' => array_merge($validated['metadata'] ?? [], [
                    'qualifies_for_collectible' => $qualifiesForCollectible,
                    'collectible_id' => $awardedCollectible?->id,
                    'is_duplicate' => $isDuplicateCard,
                ]),
            ]);

            // Update user star balance strictly 1:1
            if ($starsAwarded > 0) {
                $user->increment('stars_balance', $starsAwarded);
                $newBalance = $user->fresh()->stars_balance;

                StarTransaction::create([
                    'user_id' => $user->id,
                    'amount' => $starsAwarded,
                    'balance_after' => $newBalance,
                    'source_type' => 'minigame_session',
                    'source_id' => $session->id,
                    'description' => "Nilaro ang {$validated['game_type']} ({$score}/20 puntos)",
                ]);
            } else {
                $newBalance = $user->stars_balance;
            }

            return response()->json([
                'message' => $qualifiesForCollectible
                    ? 'Napakagaling! Nakakuha ka ng mahiwagang kard!'
                    : 'Magaling! Nakaipon ka ng mga bituin!',
                'session' => [
                    'id' => $session->id,
                    'session_id' => $session->session_id,
                    'score' => $score,
                    'total_levels' => 20,
                    'stars_awarded' => $starsAwarded,
                    'stars_balance' => $newBalance,
                    'qualifies_for_collectible' => $qualifiesForCollectible,
                    'collectible' => $awardedCollectible ? [
                        'id' => $awardedCollectible->id,
                        'slug' => $awardedCollectible->slug,
                        'name' => $awardedCollectible->name,
                        'filipino_name' => $awardedCollectible->filipino_name,
                        'category' => $awardedCollectible->category ?: 'Mga Hayop',
                        'description' => $awardedCollectible->description,
                        'image_url' => $awardedCollectible->image_url,
                        'audio_url' => $awardedCollectible->audio_url,
                        'rarity' => $awardedCollectible->rarity,
                        'is_duplicate' => $isDuplicateCard,
                    ] : null,
                ],
            ]);
        });
    }

    /**
     * Resolve raw category slug or name into standard Collectible category name.
     */
    private function resolveCategoryName(?string $raw): ?string
    {
        if (!$raw) return null;
        $c = strtolower(trim($raw));
        if (str_contains($c, 'hayop') || $c === 'animals') return 'Mga Hayop';
        if (str_contains($c, 'prutas') || $c === 'fruits') return 'Mga Prutas';
        if (str_contains($c, 'gulay') || $c === 'vegetables') return 'Mga Gulay';
        if (str_contains($c, 'kulay') || $c === 'colors') return 'Mga Kulay';
        if (str_contains($c, 'hugis') || $c === 'shapes') return 'Mga Hugis';
        if (str_contains($c, 'bilang') || str_contains($c, 'numero') || $c === 'numbers') return 'Mga Bilang';
        if (str_contains($c, 'katawan') || $c === 'body') return 'Mga Bahagi ng Katawan';
        if (str_contains($c, 'bati') || $c === 'phrases' || $c === 'greetings') return 'Mga Pagbati';
        return null;
    }
}
