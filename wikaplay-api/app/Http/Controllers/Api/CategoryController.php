<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\QuizAvailability;
use App\Models\QuizQuestion;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    /**
     * List all published categories with quiz availability summary.
     */
    public function index(Request $request)
    {
        $categories = Category::where('is_published', true)
            ->withCount([
                'flashcards' => fn($q) => $q->where('is_published', true),
            ])
            ->with('quizAvailabilities')
            ->orderBy('sort_order')
            ->get();

        $data = $categories->map(function ($cat) {
            $availabilities = [];
            foreach (['madali', 'katamtaman', 'mahirap'] as $diff) {
                $setting = $cat->quizAvailabilities->firstWhere('difficulty', $diff);
                $availabilities[$diff] = [
                    'is_locked' => $setting ? $setting->is_locked : false,
                    'pass_score' => $setting ? $setting->pass_score : 3,
                ];
            }

            return [
                'id' => $cat->id,
                'slug' => $cat->slug,
                'name' => $cat->name,
                'title' => $cat->title,
                'description' => $cat->description,
                'cover_image' => $cat->cover_image,
                'color' => $cat->color,
                'flashcards_count' => $cat->flashcards_count,
                'quiz_availabilities' => $availabilities,
            ];
        });

        return response()->json([
            'categories' => $data,
        ]);
    }

    /**
     * Get a specific category with its flashcards.
     */
    public function show($slug)
    {
        $category = Category::where('slug', $slug)
            ->where('is_published', true)
            ->with(['flashcards' => fn($q) => $q->where('is_published', true)->orderBy('sort_order')])
            ->with('quizAvailabilities')
            ->firstOrFail();

        $availabilities = [];
        foreach (['madali', 'katamtaman', 'mahirap'] as $diff) {
            $setting = $category->quizAvailabilities->firstWhere('difficulty', $diff);
            $availabilities[$diff] = [
                'is_locked' => $setting ? $setting->is_locked : false,
                'pass_score' => $setting ? $setting->pass_score : 3,
            ];
        }

        return response()->json([
            'category' => [
                'id' => $category->id,
                'slug' => $category->slug,
                'name' => $category->name,
                'title' => $category->title,
                'description' => $category->description,
                'cover_image' => $category->cover_image,
                'color' => $category->color,
                'flashcards' => $category->flashcards,
                'quiz_availabilities' => $availabilities,
            ],
        ]);
    }

    /**
     * Get flashcards for a category.
     */
    public function flashcards($slug)
    {
        $category = Category::where('slug', $slug)
            ->where('is_published', true)
            ->firstOrFail();

        $flashcards = $category->flashcards()
            ->where('is_published', true)
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'category' => [
                'id' => $category->id,
                'slug' => $category->slug,
                'name' => $category->name,
                'color' => $category->color,
            ],
            'flashcards' => $flashcards,
        ]);
    }

    /**
     * Load questions for a quiz by category slug and difficulty.
     * Enforces quiz lock and Katamtaman audio-picture formatting!
     */
    public function getQuizQuestions(Request $request, $slug, $difficulty)
    {
        $difficulty = strtolower($difficulty);
        if (!in_array($difficulty, ['madali', 'katamtaman', 'mahirap'])) {
            return response()->json(['message' => 'Di-wastong antas ng kahirapan.'], 400);
        }

        $category = Category::where('slug', $slug)
            ->where('is_published', true)
            ->firstOrFail();

        // 1. Check if teacher locked this quiz
        $availability = QuizAvailability::where('category_id', $category->id)
            ->where('difficulty', $difficulty)
            ->first();

        if ($availability && $availability->is_locked) {
            return response()->json([
                'message' => 'Naka-lock pa ang pagsusulit na ito. Maghintay sa tagubilin ng guro.',
                'is_locked' => true,
            ], 403);
        }

        // 2. Load questions with flashcard relation so dynamic updates reflect immediately
        $questions = QuizQuestion::where('category_id', $category->id)
            ->where('difficulty', $difficulty)
            ->with(['flashcard' => fn($q) => $q->where('is_published', true)])
            ->orderBy('sort_order')
            ->get();

        // 3. Format questions according to difficulty requirements
        $formattedQuestions = $questions->map(function ($q) use ($difficulty) {
            $isKatamtaman = ($difficulty === 'katamtaman');

            // Format choices
            $choices = is_array($q->choices) ? $q->choices : json_decode($q->choices, true);

            if ($isKatamtaman) {
                // Katamtaman: Question prominently at the top ("Nasaan ang [target]?"), 4 pictures, no text labels beneath
                $choices = array_map(function ($choice) {
                    return [
                        'id' => (string)($choice['id'] ?? ''),
                        'image_url' => $choice['image_url'] ?? '',
                        'text' => '', // No names beneath pictures
                    ];
                }, $choices);

                $targetName = $q->target_item_name ?: ($q->flashcard ? $q->flashcard->filipino_name : '');
                $questionText = !empty($q->question_text) ? $q->question_text : ('Nasaan ang ' . strtolower($targetName) . '?');
            } elseif ($difficulty === 'mahirap') {
                $targetName = $q->target_item_name ?: ($q->flashcard ? $q->flashcard->filipino_name : '');
                $questionText = !empty($q->question_text) ? $q->question_text : 'Ayusin ang mga letra.';
            } else {
                $targetName = $q->target_item_name;
                $questionText = $q->question_text;
            }

            return [
                'id' => $q->id,
                'flashcard_id' => $q->flashcard_id,
                'question_text' => $questionText,
                'audio_url' => $q->effective_audio_url,
                'target_image_url' => $q->effective_image_url,
                'target_item_name' => $targetName,
                'choices' => $choices,
                'correct_answer' => (string)$q->correct_answer,
                'points' => 1,
                'difficulty' => $q->difficulty,
            ];
        });

        // Ensure Katamtaman and Mahirap quizzes have 20 questions
        $targetCount = ($difficulty === 'katamtaman' || $difficulty === 'mahirap') ? 20 : 10;
        if ($formattedQuestions->count() < $targetCount) {
            $flashcards = $category->flashcards()->where('is_published', true)->get();
            if ($flashcards->isNotEmpty()) {
                $allFlashcards = $flashcards->all();
                $existingCount = $formattedQuestions->count();
                $needed = $targetCount - $existingCount;
                for ($i = 0; $i < $needed; $i++) {
                    $targetFc = $allFlashcards[$i % count($allFlashcards)];
                    $otherFcs = array_values(array_filter($allFlashcards, fn($f) => $f->id !== $targetFc->id));
                    shuffle($otherFcs);
                    $choiceFcs = array_merge([$targetFc], array_slice($otherFcs, 0, min(3, count($otherFcs))));
                    shuffle($choiceFcs);

                    $choices = array_map(function ($f) use ($difficulty) {
                        return [
                            'id' => (string)$f->id,
                            'image_url' => $f->image_url,
                            'text' => ($difficulty === 'katamtaman') ? '' : $f->filipino_name,
                        ];
                    }, $choiceFcs);

                    $qText = ($difficulty === 'katamtaman')
                        ? 'Nasaan ang ' . strtolower($targetFc->filipino_name) . '?'
                        : 'Ayusin ang mga letra.';

                    $correctAnswer = ($difficulty === 'katamtaman')
                        ? (string)$targetFc->id
                        : strtoupper($targetFc->filipino_name);

                    $formattedQuestions->push([
                        'id' => 10000 + $i,
                        'flashcard_id' => $targetFc->id,
                        'question_text' => $qText,
                        'audio_url' => $targetFc->audio_url,
                        'target_image_url' => $targetFc->image_url,
                        'target_item_name' => strtoupper($targetFc->filipino_name),
                        'choices' => $choices,
                        'correct_answer' => $correctAnswer,
                        'points' => 1,
                        'difficulty' => $difficulty,
                    ]);
                }
            }
        }

        return response()->json([
            'category' => [
                'id' => $category->id,
                'slug' => $category->slug,
                'name' => $category->name,
                'color' => $category->color,
            ],
            'difficulty' => $difficulty,
            'is_locked' => false,
            'pass_score' => $availability ? $availability->pass_score : ($difficulty === 'katamtaman' || $difficulty === 'mahirap' ? 15 : 7),
            'questions' => $formattedQuestions,
        ]);
    }
}
