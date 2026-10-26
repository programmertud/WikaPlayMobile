<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Collectible;
use App\Models\MinigameSession;
use App\Models\QuizSession;
use App\Models\StarTransaction;
use App\Models\StudentCollectible;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class OfflineSyncController extends Controller
{
    /**
     * Batch synchronize pending offline gameplay sessions.
     *
     * Processes multiple game sessions in a single network round-trip.
     * - Idempotent per session_id (already-synced sessions return their recorded result)
     * - Preserves 1:1 star allocation and transaction ledger
     * - Evaluates mystery box collectible awards for high scores (15-20)
     * - Returns updated authoritative star balance
     */
    public function batchSync(Request $request)
    {
        $validated = $request->validate([
            'sessions' => 'required|array|max:50',
            'sessions.*.session_id' => 'required|string',
            'sessions.*.game_type' => 'required|string',
            'sessions.*.score' => 'required|integer|min:0',
            'sessions.*.duration_seconds' => 'nullable|integer|min:0',
            'sessions.*.metadata' => 'nullable|array',
            'sessions.*.started_at' => 'nullable|string',
            'sessions.*.completed_at' => 'nullable|string',
        ]);

        $user = $request->user() ?? auth()->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $results = [];
        $syncedCount = 0;
        $duplicateCount = 0;

        foreach ($validated['sessions'] as $sessionData) {
            $sessionId = $sessionData['session_id'];
            $gameType = $sessionData['game_type'];
            $score = $sessionData['score'];
            $durationSeconds = $sessionData['duration_seconds'] ?? 0;
            $metadata = $sessionData['metadata'] ?? [];

            try {
                // Check if session has already been recorded (idempotency check)
                $existing = MinigameSession::where('session_id', $sessionId)
                    ->where('user_id', $user->id)
                    ->first();

                if ($existing) {
                    $meta = is_array($existing->metadata) ? $existing->metadata : json_decode($existing->metadata, true);
                    $collectible = null;
                    if (!empty($meta['collectible_id'])) {
                        $collectible = Collectible::find($meta['collectible_id']);
                    }

                    $results[] = [
                        'session_id' => $sessionId,
                        'status' => 'synced',
                        'is_duplicate' => true,
                        'stars_awarded' => $existing->stars_awarded,
                        'score' => $existing->score,
                        'qualifies_for_collectible' => $meta['qualifies_for_collectible'] ?? false,
                        'collectible' => $collectible ? [
                            'id' => $collectible->id,
                            'name' => $collectible->name,
                            'filipino_name' => $collectible->filipino_name,
                            'category' => $collectible->category,
                            'image_url' => $collectible->image_url,
                        ] : null,
                    ];
                    $duplicateCount++;
                    continue;
                }

                // Process new minigame session in a dedicated transaction per item
                $sessionResult = DB::transaction(function () use ($user, $sessionId, $gameType, $score, $durationSeconds, $metadata, $sessionData) {
                    $starsAwarded = min(20, max(0, $score));
                    $qualifiesForCollectible = ($score >= 15 && $score <= 20);
                    $awardedCollectible = null;
                    $isDuplicateCard = false;

                    if ($qualifiesForCollectible) {
                        $categorySlugOrName = $metadata['category'] ?? $metadata['category_slug'] ?? $metadata['category_name'] ?? null;
                        $targetCategory = $this->resolveCategoryName($categorySlugOrName);

                        $ownedIds = StudentCollectible::where('user_id', $user->id)->pluck('collectible_id');

                        $categoryQuery = Collectible::whereNotIn('id', $ownedIds);
                        if ($targetCategory) {
                            $categoryQuery->where('category', $targetCategory);
                        }
                        $unownedList = $categoryQuery->get();

                        if ($unownedList->isNotEmpty()) {
                            $chosen = $unownedList->random();
                            StudentCollectible::create([
                                'user_id' => $user->id,
                                'collectible_id' => $chosen->id,
                                'unlocked_at' => now(),
                                'is_mystery_revealed' => true,
                            ]);
                            $awardedCollectible = $chosen;
                        } else {
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
                            } else {
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

                    $completedAt = !empty($sessionData['completed_at'])
                        ? date('Y-m-d H:i:s', strtotime($sessionData['completed_at']))
                        : now();

                    $session = MinigameSession::create([
                        'user_id' => $user->id,
                        'session_id' => $sessionId,
                        'game_type' => $gameType,
                        'score' => $score,
                        'duration_seconds' => $durationSeconds,
                        'stars_awarded' => $starsAwarded,
                        'created_at' => $completedAt,
                        'metadata' => array_merge($metadata, [
                            'qualifies_for_collectible' => $qualifiesForCollectible,
                            'collectible_id' => $awardedCollectible?->id,
                            'is_duplicate' => $isDuplicateCard,
                            'synced_offline' => true,
                        ]),
                    ]);

                    if ($starsAwarded > 0) {
                        $user->increment('stars_balance', $starsAwarded);
                        $newBalance = $user->fresh()->stars_balance;

                        StarTransaction::create([
                            'user_id' => $user->id,
                            'amount' => $starsAwarded,
                            'balance_after' => $newBalance,
                            'source_type' => 'minigame_session',
                            'source_id' => $session->id,
                            'description' => "Offline sync: {$gameType} ({$score}/20 puntos)",
                        ]);
                    }

                    return [
                        'session_id' => $sessionId,
                        'status' => 'synced',
                        'is_duplicate' => false,
                        'stars_awarded' => $starsAwarded,
                        'score' => $score,
                        'qualifies_for_collectible' => $qualifiesForCollectible,
                        'collectible' => $awardedCollectible ? [
                            'id' => $awardedCollectible->id,
                            'name' => $awardedCollectible->name,
                            'filipino_name' => $awardedCollectible->filipino_name,
                            'category' => $awardedCollectible->category,
                            'image_url' => $awardedCollectible->image_url,
                        ] : null,
                    ];
                });

                $results[] = $sessionResult;
                $syncedCount++;
            } catch (\Exception $e) {
                Log::error("Failed to sync offline session {$sessionId}: " . $e->getMessage());
                $results[] = [
                    'session_id' => $sessionId,
                    'status' => 'failed',
                    'error' => 'Hindi maiproseso ang sesyon.',
                ];
            }
        }

        return response()->json([
            'message' => 'Matagumpay na natapos ang pag-sync.',
            'synced_count' => $syncedCount,
            'duplicate_count' => $duplicateCount,
            'results' => $results,
            'stars_balance' => $user->fresh()->stars_balance,
        ]);
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
