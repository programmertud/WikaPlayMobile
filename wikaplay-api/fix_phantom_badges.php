<?php
/**
 * fix_phantom_badges.php
 *
 * Artisan tinker script: Finds all student badges that were claimed
 * WITHOUT a corresponding badge_claim StarTransaction, and resets
 * them to unclaimed so the student can properly claim (with star deduction).
 *
 * Run via: php artisan tinker --execute="require base_path('fix_phantom_badges.php');"
 */

use App\Models\StudentBadge;
use App\Models\StarTransaction;
use App\Http\Controllers\Api\StudentProfileController;

$catalog = collect(StudentProfileController::BADGES_CATALOG)->keyBy('key');
$phantomBadges = StudentBadge::whereNotNull('claimed_at')->get();

$fixed = 0;
foreach ($phantomBadges as $badge) {
    $cost = $catalog->get($badge->badge_key)['threshold'] ?? 0;

    // Check if a badge_claim StarTransaction exists at or after claim time
    $txn = StarTransaction::where('user_id', $badge->user_id)
        ->where('source_type', 'badge_claim')
        ->where('amount', -$cost)
        ->where('created_at', '>=', $badge->claimed_at)
        ->first();

    if (!$txn) {
        // Phantom claim: reset to unclaimed state
        $badge->claimed_at = null;
        $badge->save();
        echo "Fixed phantom claim: user_id={$badge->user_id}, badge={$badge->badge_key}" . PHP_EOL;
        $fixed++;
    }
}

echo PHP_EOL . "Done. Fixed {$fixed} phantom badge claim(s)." . PHP_EOL;
