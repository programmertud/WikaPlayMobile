<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\QuizAnswer;
use App\Models\QuizAvailability;
use App\Models\QuizQuestion;
use App\Models\QuizSession;
use App\Models\StarTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QuizController extends Controller
{
    /**
     * Submit a completed quiz session with answer validation and idempotent scoring.
     */
    public function submit(Request $request)
    {
        $validated = $request->validate([
            'category_id' => 'required|exists:categories,id',
            'difficulty' => 'required|in:madali,katamtaman,mahirap',
            'session_id' => 'nullable|string',
            'answers' => 'required|array',
            'answers.*.question_id' => 'required',
            'answers.*.selected_answer' => 'required',
            'answers.*.is_correct' => 'nullable|boolean',
        ]);

        $user = $request->user() ?? auth()->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }
        $sessionId = $validated['session_id'] ?? null;

        // Idempotency check: prevent duplicate awards on repeat submissions / network retries
        if ($sessionId) {
            $existing = QuizSession::where('session_id', $sessionId)
                ->where('user_id', $user->id)
                ->first();

            if ($existing) {
                return response()->json([
                    'message' => 'Nai-record na ang pagsusulit na ito.',
                    'is_duplicate_submission' => true,
                    'session' => [
                        'id' => $existing->id,
                        'session_id' => $existing->session_id,
                        'score' => $existing->score,
                        'total_questions' => $existing->total_questions,
                        'correct_count' => $existing->correct_count,
                        'wrong_count' => $existing->wrong_count,
                        'passed' => $existing->passed,
                        'stars_awarded' => $existing->stars_awarded,
                        'stars_balance' => $user->stars_balance,
                    ],
                ]);
            }
        }

        $category = Category::findOrFail($validated['category_id']);
        $difficulty = $validated['difficulty'];

        // Check if locked
        $availability = QuizAvailability::where('category_id', $category->id)
            ->where('difficulty', $difficulty)
            ->first();

        if ($availability && $availability->is_locked) {
            return response()->json([
                'error_code' => 'QUIZ_LOCKED',
                'message' => 'Naka-lock ang pagsusulit na ito. Hindi pinapayagan ang pagsusumite.',
                'is_locked' => true,
            ], 403);
        }

        return DB::transaction(function () use ($user, $category, $difficulty, $validated, $availability, $sessionId) {
            $numericQuestionIds = collect($validated['answers'])
                ->pluck('question_id')
                ->filter(fn($id) => is_numeric($id) && $id < 10000);
            $questions = QuizQuestion::whereIn('id', $numericQuestionIds)->get()->keyBy('id');
            $flashcards = $category->flashcards()->get();

            $score = 0;
            $correctCount = 0;
            $wrongCount = 0;
            $totalQuestions = count($validated['answers']);
            $processedAnswers = [];

            foreach ($validated['answers'] as $ans) {
                $rawQid = $ans['question_id'];
                $q = (is_numeric($rawQid) && $rawQid < 10000) ? $questions->get($rawQid) : null;

                $userAnswer = trim(mb_strtolower((string)$ans['selected_answer']));
                $isCorrect = false;

                if ($q) {
                    $expectedAnswer = trim(mb_strtolower((string)$q->correct_answer));
                    $isCorrect = ($userAnswer === $expectedAnswer);
                } elseif (isset($ans['is_correct'])) {
                    $isCorrect = (bool)$ans['is_correct'];
                } else {
                    // Check if answer matches any flashcard in this category
                    foreach ($flashcards as $fc) {
                        if ((string)$fc->id === $userAnswer || trim(mb_strtolower($fc->filipino_name)) === $userAnswer) {
                            $isCorrect = true;
                            break;
                        }
                    }
                }

                if ($isCorrect) {
                    $score += ($q ? $q->points : 1);
                    $correctCount++;
                } else {
                    $wrongCount++;
                }

                $processedAnswers[] = [
                    'question_id' => $q ? $q->id : null,
                    'question_key' => (string)$rawQid,
                    'selected_answer' => (string)$ans['selected_answer'],
                    'is_correct' => $isCorrect,
                ];
            }

            $passScore = $availability ? $availability->pass_score : ceil($totalQuestions * 0.7);
            $passed = ($correctCount >= $passScore);

            // Rule: 1:1 star reward for correct questions (20 questions = up to 20 stars)
            // Strict 1:1 star balance update: earning 20 stars adds exactly 20 stars
            $starsAwarded = min(20, min($totalQuestions, max(0, $correctCount)));

            $session = QuizSession::create([
                'user_id' => $user->id,
                'session_id' => $sessionId,
                'category_id' => $category->id,
                'difficulty' => $difficulty,
                'score' => $score,
                'total_questions' => $totalQuestions,
                'correct_count' => $correctCount,
                'wrong_count' => $wrongCount,
                'passed' => $passed,
                'stars_awarded' => $starsAwarded,
                'completed_at' => now(),
            ]);

            foreach ($processedAnswers as $item) {
                QuizAnswer::create([
                    'quiz_session_id' => $session->id,
                    'question_id' => $item['question_id'],
                    'question_key' => $item['question_key'],
                    'selected_answer' => $item['selected_answer'],
                    'is_correct' => $item['is_correct'],
                ]);
            }

            // Award stars if earned (Rule 2: strict 1:1 balance update)
            if ($starsAwarded > 0) {
                $user->increment('stars_balance', $starsAwarded);
                $newBalance = $user->fresh()->stars_balance;

                StarTransaction::create([
                    'user_id' => $user->id,
                    'amount' => $starsAwarded,
                    'balance_after' => $newBalance,
                    'source_type' => 'quiz_session',
                    'source_id' => $session->id,
                    'description' => "Natapos ang {$category->name} ({$difficulty}) na may {$correctCount}/{$totalQuestions} tamang sagot",
                ]);
            } else {
                $newBalance = $user->stars_balance;
            }

            return response()->json([
                'message' => $passed ? 'Napakagaling! Naipasa mo ang pagsusulit!' : 'Subukang muli! Kaya mo \'yan!',
                'session' => [
                    'id' => $session->id,
                    'session_id' => $session->session_id,
                    'score' => $score,
                    'total_questions' => $totalQuestions,
                    'correct_count' => $correctCount,
                    'wrong_count' => $wrongCount,
                    'passed' => $passed,
                    'stars_awarded' => $starsAwarded,
                    'stars_balance' => $newBalance,
                ],
            ]);
        });
    }

    /**
     * Get quiz history for the authenticated student.
     */
    public function history(Request $request)
    {
        $user = $request->user();

        $history = QuizSession::where('user_id', $user->id)
            ->with('category:id,name,color')
            ->orderByDesc('created_at')
            ->paginate(15);

        return response()->json($history);
    }
}
