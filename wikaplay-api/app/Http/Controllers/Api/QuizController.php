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
            'answers' => 'required|array',
            'answers.*.question_id' => 'required|exists:quiz_questions,id',
            'answers.*.selected_answer' => 'required|string',
        ]);

        $user = $request->user();
        $category = Category::findOrFail($validated['category_id']);
        $difficulty = $validated['difficulty'];

        // Check if locked
        $availability = QuizAvailability::where('category_id', $category->id)
            ->where('difficulty', $difficulty)
            ->first();

        if ($availability && $availability->is_locked) {
            return response()->json([
                'message' => 'Naka-lock ang pagsusulit na ito.',
            ], 403);
        }

        return DB::transaction(function () use ($user, $category, $difficulty, $validated, $availability) {
            $questionIds = collect($validated['answers'])->pluck('question_id');
            $questions = QuizQuestion::whereIn('id', $questionIds)->get()->keyBy('id');

            $score = 0;
            $correctCount = 0;
            $wrongCount = 0;
            $totalQuestions = count($validated['answers']);
            $processedAnswers = [];

            foreach ($validated['answers'] as $ans) {
                $q = $questions->get($ans['question_id']);
                if (!$q) continue;

                $isCorrect = ((string)$ans['selected_answer'] === (string)$q->correct_answer);

                if ($isCorrect) {
                    $score += $q->points;
                    $correctCount++;
                } else {
                    $wrongCount++;
                }

                $processedAnswers[] = [
                    'question_id' => $q->id,
                    'selected_answer' => $ans['selected_answer'],
                    'is_correct' => $isCorrect,
                ];
            }

            $passScore = $availability ? $availability->pass_score : ceil($totalQuestions * 0.7);
            $passed = ($correctCount >= $passScore);

            // Determine star reward idempotently
            $alreadyPassed = QuizSession::where('user_id', $user->id)
                ->where('category_id', $category->id)
                ->where('difficulty', $difficulty)
                ->where('passed', true)
                ->exists();

            $starsAwarded = 0;
            if ($passed) {
                // First time passing: award 5 stars for Madali, 10 for Katamtaman, 15 for Mahirap
                // Repeat pass: 1 practice star
                if (!$alreadyPassed) {
                    $starsAwarded = match ($difficulty) {
                        'madali' => 5,
                        'katamtaman' => 10,
                        'mahirap' => 15,
                    };
                } else {
                    $starsAwarded = 1;
                }
            }

            $session = QuizSession::create([
                'user_id' => $user->id,
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
                    'selected_answer' => $item['selected_answer'],
                    'is_correct' => $item['is_correct'],
                ]);
            }

            // Award stars if earned
            if ($starsAwarded > 0) {
                $user->increment('stars_balance', $starsAwarded);
                $newBalance = $user->fresh()->stars_balance;

                StarTransaction::create([
                    'user_id' => $user->id,
                    'amount' => $starsAwarded,
                    'balance_after' => $newBalance,
                    'source_type' => 'quiz_session',
                    'source_id' => $session->id,
                    'description' => "Natapos ang {$category->name} ({$difficulty})",
                ]);
            }

            return response()->json([
                'message' => $passed ? 'Napakagaling! Naipasa mo ang pagsusulit!' : 'Subukang muli! Kaya mo \'yan!',
                'session' => [
                    'id' => $session->id,
                    'score' => $score,
                    'total_questions' => $totalQuestions,
                    'correct_count' => $correctCount,
                    'wrong_count' => $wrongCount,
                    'passed' => $passed,
                    'stars_awarded' => $starsAwarded,
                    'stars_balance' => $user->fresh()->stars_balance,
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
