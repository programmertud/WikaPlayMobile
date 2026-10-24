<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Collectible;
use App\Models\MinigameSession;
use App\Models\QuizSession;
use App\Models\StarTransaction;
use App\Models\StudentBadge;
use App\Models\StudentCollectible;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

class StarSystemAndTeacherTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        if (Category::count() === 0) {
            $this->artisan('db:seed', ['--class' => 'WikaPlaySeeder']);
        }
        if (Collectible::count() === 0) {
            $this->artisan('db:seed', ['--class' => 'CollectiblesSeeder']);
        }
    }

    /**
     * Test A:
     * Previous balance = 475.
     * Valid stars earned = 20.
     * Expected new balance = 495.
     */
    public function test_a_star_balance_increases_from_475_to_495(): void
    {
        $student = User::factory()->create([
            'role' => 'student',
            'stars_balance' => 475,
        ]);

        $response = $this->actingAs($student, 'sanctum')->postJson('/api/minigames/submit', [
            'game_type' => 'memory_match',
            'score' => 20,
            'session_id' => (string) Str::uuid(),
            'duration_seconds' => 45,
            'metadata' => ['category' => 'Mga Hayop'],
        ]);

        $response->assertStatus(200);
        $this->assertEquals(20, $response->json('session.stars_awarded'));
        $this->assertEquals(495, $response->json('session.stars_balance'));

        $student->refresh();
        $this->assertEquals(495, $student->stars_balance);

        // Verify StarTransaction
        $this->assertDatabaseHas('star_transactions', [
            'user_id' => $student->id,
            'amount' => 20,
            'balance_after' => 495,
            'source_type' => 'minigame_session',
        ]);
    }

    /**
     * Test B:
     * Previous balance = 500.
     * Valid stars earned = 10.
     * Expected new balance = 510.
     */
    public function test_b_star_balance_increases_from_500_to_510(): void
    {
        $student = User::factory()->create([
            'role' => 'student',
            'stars_balance' => 500,
        ]);

        $response = $this->actingAs($student, 'sanctum')->postJson('/api/minigames/submit', [
            'game_type' => 'paghahanap_larawan',
            'score' => 10,
            'session_id' => (string) Str::uuid(),
            'duration_seconds' => 30,
            'metadata' => ['category' => 'Mga Hayop'],
        ]);

        $response->assertStatus(200);
        $this->assertEquals(10, $response->json('session.stars_awarded'));
        $this->assertEquals(510, $response->json('session.stars_balance'));

        $student->refresh();
        $this->assertEquals(510, $student->stars_balance);
    }

    /**
     * Test C:
     * Student earns Ultimate Learner badge at 480 stars.
     * The badge remains earned, and subsequent valid awards increase the balance above 480.
     */
    public function test_c_ultimate_learner_badge_earned_at_480_and_balance_surpasses_480(): void
    {
        $student = User::factory()->create([
            'role' => 'student',
            'stars_balance' => 470,
        ]);

        // Record initial transactions so lifetime stars = 470
        StarTransaction::create([
            'user_id' => $student->id,
            'amount' => 470,
            'balance_after' => 470,
            'source_type' => 'initial_seed',
            'description' => 'Initial stars',
        ]);

        // Student earns 15 stars -> total 485 stars (passes 480 threshold)
        $submitRes = $this->actingAs($student, 'sanctum')->postJson('/api/minigames/submit', [
            'game_type' => 'hulaan_salita',
            'score' => 15,
            'session_id' => (string) Str::uuid(),
            'duration_seconds' => 60,
            'metadata' => ['category' => 'Mga Hayop'],
        ]);

        $submitRes->assertStatus(200);
        $this->assertEquals(485, $submitRes->json('session.stars_balance'));

        // Check achievements endpoint
        $achievementsRes = $this->actingAs($student, 'sanctum')->getJson('/api/rewards/achievements');
        $achievementsRes->assertStatus(200);

        $badges = collect($achievementsRes->json('badges'));
        $ultimateBadge = $badges->firstWhere('key', 'ultimate_learner');

        $this->assertNotNull($ultimateBadge);
        $this->assertTrue(in_array($ultimateBadge['status'], ['unlocked', 'claimed']));
        $this->assertEquals(480, $ultimateBadge['threshold']);

        // Claim the badge
        $claimRes = $this->actingAs($student, 'sanctum')->postJson('/api/rewards/claim-badge', [
            'badge_key' => 'ultimate_learner',
        ]);
        $claimRes->assertStatus(200);

        // Earn more stars (e.g. 10 stars) -> balance should become 495
        $moreStarsRes = $this->actingAs($student, 'sanctum')->postJson('/api/minigames/submit', [
            'game_type' => 'gulong_letra',
            'score' => 10,
            'session_id' => (string) Str::uuid(),
            'duration_seconds' => 40,
            'metadata' => ['category' => 'Mga Hayop'],
        ]);
        $moreStarsRes->assertStatus(200);
        $this->assertEquals(495, $moreStarsRes->json('session.stars_balance'));

        // Ultimate learner badge must still be claimed
        $checkBadgeRes = $this->actingAs($student, 'sanctum')->getJson('/api/rewards/achievements');
        $badgesAfter = collect($checkBadgeRes->json('badges'));
        $ultimateBadgeAfter = $badgesAfter->firstWhere('key', 'ultimate_learner');
        $this->assertEquals('claimed', $ultimateBadgeAfter['status']);
    }

    /**
     * Test D:
     * The same activity reward request is submitted twice (idempotency check).
     * The activity's reward must only be processed once.
     */
    public function test_d_duplicate_activity_submission_is_idempotent(): void
    {
        $student = User::factory()->create([
            'role' => 'student',
            'stars_balance' => 100,
        ]);

        $sessionId = (string) Str::uuid();

        // First submission
        $res1 = $this->actingAs($student, 'sanctum')->postJson('/api/minigames/submit', [
            'game_type' => 'pop_balloon',
            'score' => 18,
            'session_id' => $sessionId,
            'duration_seconds' => 50,
            'metadata' => ['category' => 'Mga Hayop'],
        ]);
        $res1->assertStatus(200);
        $this->assertEquals(118, $res1->json('session.stars_balance'));

        // Second submission with identical session_id
        $res2 = $this->actingAs($student, 'sanctum')->postJson('/api/minigames/submit', [
            'game_type' => 'pop_balloon',
            'score' => 18,
            'session_id' => $sessionId,
            'duration_seconds' => 50,
            'metadata' => ['category' => 'Mga Hayop'],
        ]);
        $res2->assertStatus(200);
        $this->assertTrue($res2->json('is_duplicate_submission'));
        $this->assertEquals(118, $res2->json('session.stars_balance'));

        // Verify database only has 1 transaction and 1 session
        $this->assertEquals(1, MinigameSession::where('session_id', $sessionId)->count());
        $this->assertEquals(1, StarTransaction::where('source_type', 'minigame_session')->where('user_id', $student->id)->count());

        $student->refresh();
        $this->assertEquals(118, $student->stars_balance);
    }

    /**
     * Test E:
     * A student spends stars (or teacher manual negative adjustment).
     * The spendable balance decreases correctly, and lifetime earned stars remain an accurate historical total.
     */
    public function test_e_star_spending_reduces_spendable_balance_leaving_lifetime_intact(): void
    {
        $student = User::factory()->create([
            'role' => 'student',
            'stars_balance' => 200,
        ]);

        StarTransaction::create([
            'user_id' => $student->id,
            'amount' => 200,
            'balance_after' => 200,
            'source_type' => 'initial_seed',
            'description' => 'Lifetime earnings',
        ]);

        $teacher = User::factory()->create([
            'role' => 'teacher',
        ]);

        // Teacher adjusts student's balance by -50 stars
        $res = $this->actingAs($teacher, 'sanctum')->postJson("/api/teacher/students/{$student->id}/adjust-stars", [
            'amount' => -50,
            'reason' => 'Paggamit ng reward item',
        ]);
        $res->assertStatus(200);
        $this->assertEquals(150, $res->json('student.stars_balance'));

        $student->refresh();
        $this->assertEquals(150, $student->stars_balance);

        // Lifetime stars earned should still be 200!
        $lifetime = (int) StarTransaction::where('user_id', $student->id)
            ->where('amount', '>', 0)
            ->sum('amount');
        $this->assertEquals(200, $lifetime);

        // Check student history endpoint returns both 200 lifetime and 150 spendable
        $historyRes = $this->actingAs($teacher, 'sanctum')->getJson("/api/teacher/students/{$student->id}/history");
        $historyRes->assertStatus(200);
        $this->assertEquals(150, $historyRes->json('student.stars_balance'));
        $this->assertEquals(200, $historyRes->json('student.lifetime_stars'));
        $this->assertEquals(50, $historyRes->json('student.stars_spent'));
    }

    /**
     * Test F:
     * Teacher authorization and student isolation.
     * Students receiving 403 Forbidden on teacher endpoints.
     */
    public function test_f_teacher_endpoints_require_teacher_role(): void
    {
        $student = User::factory()->create(['role' => 'student']);

        $res = $this->actingAs($student, 'sanctum')->getJson('/api/teacher/dashboard');
        $res->assertStatus(403);

        $resStudents = $this->actingAs($student, 'sanctum')->getJson('/api/teacher/students');
        $resStudents->assertStatus(403);

        $teacher = User::factory()->create(['role' => 'teacher']);
        $resTeacher = $this->actingAs($teacher, 'sanctum')->getJson('/api/teacher/dashboard');
        $resTeacher->assertStatus(200)
            ->assertJsonStructure([
                'overview' => [
                    'total_students',
                    'online_students',
                    'total_quiz_attempts',
                    'completed_minigames',
                    'average_accuracy',
                    'total_stars_earned',
                    'total_stars_available',
                ],
                'charts',
            ]);
    }

    /**
     * Test G:
     * Negative star balance is prevented during teacher adjustment.
     */
    public function test_g_teacher_adjustment_prevents_negative_balance(): void
    {
        $student = User::factory()->create([
            'role' => 'student',
            'stars_balance' => 30,
        ]);

        $teacher = User::factory()->create(['role' => 'teacher']);

        $res = $this->actingAs($teacher, 'sanctum')->postJson("/api/teacher/students/{$student->id}/adjust-stars", [
            'amount' => -50,
            'reason' => 'Subukang gawing negatibo',
        ]);

        $res->assertStatus(422);
        $student->refresh();
        $this->assertEquals(30, $student->stars_balance);
    }

    /**
     * Test H:
     * Collectible qualification: scores 15-20 qualify for mystery box, scores 0-14 do not.
     */
    public function test_h_mystery_box_qualification_policy(): void
    {
        $student = User::factory()->create(['role' => 'student', 'stars_balance' => 0]);

        // Score 14/20 -> Does NOT qualify
        $resFail = $this->actingAs($student, 'sanctum')->postJson('/api/minigames/submit', [
            'game_type' => 'memory_match',
            'score' => 14,
            'session_id' => (string) Str::uuid(),
            'duration_seconds' => 35,
            'metadata' => ['category' => 'Mga Hayop'],
        ]);
        $resFail->assertStatus(200);
        $this->assertFalse($resFail->json('session.qualifies_for_collectible'));
        $this->assertNull($resFail->json('session.collectible'));

        // Score 15/20 -> DOES qualify
        $resPass = $this->actingAs($student, 'sanctum')->postJson('/api/minigames/submit', [
            'game_type' => 'memory_match',
            'score' => 15,
            'session_id' => (string) Str::uuid(),
            'duration_seconds' => 40,
            'metadata' => ['category' => 'Mga Hayop'],
        ]);
        $resPass->assertStatus(200);
        $this->assertTrue($resPass->json('session.qualifies_for_collectible'));
        $this->assertNotNull($resPass->json('session.collectible'));
    }
}
