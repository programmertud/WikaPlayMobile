<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\QuizAvailability;
use App\Models\QuizQuestion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class CategoryController extends Controller
{
    /**
     * List all published categories with quiz availability summary.
     */
    public function index(Request $request)
    {
        // Categories are global (shared curriculum), always show all published categories
        $categories = Category::where('is_published', true)
            ->withCount([
                'flashcards' => fn ($q) => $q->where('is_published', true),
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
    public function show(Request $request, $slug)
    {
        $user = $request->user() ?? auth('sanctum')->user();
        $sectionId = ($user && $user->section_id) ? $user->section_id : $request->query('section_id');

        $flashcardsQuery = fn ($q) => $q->where('is_published', true)->orderBy('sort_order');

        // If student belongs to a section, show flashcards from their section OR global flashcards
        if ($sectionId && Schema::hasColumn('flashcards', 'section_id')) {
            $flashcardsQuery = fn ($q) => $q->where('is_published', true)
                ->where(function ($sq) use ($sectionId) {
                    $sq->where('section_id', $sectionId)
                        ->orWhereNull('section_id');
                })
                ->orderBy('sort_order');
        }

        $category = Category::where('slug', $slug)
            ->where('is_published', true)
            ->with(['flashcards' => $flashcardsQuery])
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
    public function flashcards(Request $request, $slug)
    {
        $user = $request->user() ?? auth('sanctum')->user();
        $sectionId = ($user && $user->section_id) ? $user->section_id : $request->query('section_id');

        $category = Category::where('slug', $slug)
            ->where('is_published', true)
            ->firstOrFail();

        $flashcardsQuery = $category->flashcards()
            ->where('is_published', true);

        // Section-based flashcard isolation:
        // - If student has a section: show ONLY that section's flashcards (teacher-customized).
        //   If teacher hasn't added any yet, fall back to base curriculum (sort_order <= 20).
        // - If student has NO section: show ONLY base curriculum (sort_order <= 20).
        // This prevents cross-contamination between different teachers' sections.
        if (Schema::hasColumn('flashcards', 'section_id')) {
            if ($sectionId) {
                $sectionFcCount = (clone $flashcardsQuery)->where('section_id', $sectionId)->count();
                if ($sectionFcCount > 0) {
                    // Teacher has flashcards for this section — show ONLY their flashcards
                    $flashcardsQuery->where('section_id', $sectionId);
                } else {
                    // No section-specific flashcards yet — show ONLY base curriculum
                    $flashcardsQuery->whereNull('section_id')->where('sort_order', '<=', 20);
                }
            } else {
                // Student has no section — show ONLY base curriculum (sort_order <= 20)
                $flashcardsQuery->whereNull('section_id')->where('sort_order', '<=', 20);
            }
        }

        $flashcards = $flashcardsQuery->orderBy('sort_order')->get();

        // Convert relative image URLs to full URLs
        $flashcards = $flashcards->map(function ($flashcard) {
            if ($flashcard->image_url && ! str_starts_with($flashcard->image_url, 'http')) {
                $flashcard->image_url = url('storage/'.ltrim($flashcard->image_url, '/'));
            }
            if ($flashcard->audio_url && ! str_starts_with($flashcard->audio_url, 'http')) {
                $flashcard->audio_url = url('storage/'.ltrim($flashcard->audio_url, '/'));
            }

            return $flashcard;
        });

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
        if (! in_array($difficulty, ['madali', 'katamtaman', 'mahirap'])) {
            return response()->json(['message' => 'Di-wastong antas ng kahirapan.'], 400);
        }

        $user = $request->user() ?? auth('sanctum')->user();
        $sectionId = ($user && $user->section_id) ? $user->section_id : $request->query('section_id');

        $category = Category::where('slug', $slug)
            ->where('is_published', true)
            ->firstOrFail();

        // 1. Check if teacher locked this quiz
        $availability = QuizAvailability::where('category_id', $category->id)
            ->where('difficulty', $difficulty)
            ->first();

        if ($availability && $availability->is_locked) {
            return response()->json([
                'error_code' => 'QUIZ_LOCKED',
                'message' => 'Naka-lock pa ang pagsusulit na ito. Maghintay sa tagubilin ng guro.',
                'is_locked' => true,
            ], 403);
        }

        // 2. Load questions with flashcard relation so dynamic updates reflect immediately
        $questionsQuery = QuizQuestion::where('category_id', $category->id)
            ->where('difficulty', $difficulty)
            ->with(['flashcard' => fn ($q) => $q->where('is_published', true)]);

        // If student belongs to a section, prefer section-specific quiz questions.
        // For Madali, base curriculum questions (20 questions) live in the mobile app.
        // The API only returns teacher-created custom questions (section_id IS NOT NULL).
        // Never return the dummy seeded questions (section_id IS NULL) which have 'Ano ang nasa larawan?'.
        if ($difficulty === 'madali') {
            if ($sectionId && Schema::hasColumn('quiz_questions', 'section_id')) {
                $questionsQuery->where('section_id', $sectionId);
            } else {
                $questionsQuery->whereRaw('1 = 0');
            }
        } elseif ($sectionId && Schema::hasColumn('quiz_questions', 'section_id')) {
            $sectionQCount = (clone $questionsQuery)->where('section_id', $sectionId)->count();
            if ($sectionQCount > 0) {
                // Teacher has questions for this section — show ONLY their questions
                $questionsQuery->where('section_id', $sectionId);
            } else {
                // No section-specific questions — show global questions
                $questionsQuery->whereNull('section_id');
            }
        }

        $questions = $questionsQuery->orderBy('sort_order')->get();

        // Helper: resolve a relative storage path to an absolute URL
        $resolveUrl = function (?string $url): string {
            if (empty($url)) return '';
            if (str_contains($url, 'wikaplay.app')) return '';
            if (str_starts_with($url, 'http://') || str_starts_with($url, 'https://')) {
                // Fix any localhost URLs to production server
                if (str_contains($url, 'localhost') || str_contains($url, '127.0.0.1')) {
                    $url = preg_replace('#https?://(?:localhost|127\.0\.0\.1)(?::\d+)?/#', 'https://wikaplay-api.onrender.com/', $url);
                }
                return $url;
            }
            // Relative path: /storage/... or storage/...
            return url('storage/'.ltrim(preg_replace('#^/?storage/?#', '', $url), '/'));
        };

        // 3. Format questions according to difficulty requirements
        $formattedQuestions = $questions->map(function ($q) use ($difficulty, $resolveUrl) {
            $isKatamtaman = ($difficulty === 'katamtaman');

            // Format choices
            $choices = is_array($q->choices) ? $q->choices : json_decode($q->choices, true);

            if ($isKatamtaman) {
                // Katamtaman: Question prominently at the top ("Nasaan ang [target]?"), 4 pictures
                $choices = array_map(function ($choice) use ($resolveUrl) {
                    $img = $resolveUrl((string) ($choice['image_url'] ?? ''));
                    return [
                        'id' => (string) ($choice['id'] ?? ''),
                        'image_url' => $img,
                        'text' => (string) ($choice['text'] ?? $choice['filipino_name'] ?? ''),
                    ];
                }, $choices);

                $targetName = $q->target_item_name ?: ($q->flashcard ? $q->flashcard->filipino_name : '');
                $questionText = ! empty($q->question_text) ? $q->question_text : ('Nasaan ang '.strtolower($targetName).'?');
            } elseif ($difficulty === 'mahirap') {
                $targetName = $q->target_item_name ?: ($q->flashcard ? $q->flashcard->filipino_name : '');
                $questionText = ! empty($q->question_text) ? $q->question_text : 'Ayusin ang mga letra.';
            } else {
                $targetName = $q->target_item_name;
                $questionText = $q->question_text;
            }

            $effectiveTargetImg = $resolveUrl((string) ($q->effective_image_url ?? ''));
            $effectiveAudioUrl = $resolveUrl((string) ($q->effective_audio_url ?? ''));

            return [
                'id' => $q->id,
                'flashcard_id' => $q->flashcard_id,
                'question_text' => $questionText,
                'question_text_en' => $q->question_text_en ?? null,
                'english_on_top' => (bool) ($q->english_on_top ?? false),
                'audio_url' => $effectiveAudioUrl ?: null,
                'target_image_url' => $effectiveTargetImg,
                'target_item_name' => $targetName,
                'choices' => $choices,
                'correct_answer' => (string) $q->correct_answer,
                'points' => 1,
                'difficulty' => $q->difficulty,
            ];
        });

        // Ensure Katamtaman and Mahirap quizzes have 20 questions (Madali uses the mobile curriculum bank)
        if (($difficulty === 'katamtaman' || $difficulty === 'mahirap') && $formattedQuestions->count() < 20) {
            $targetCount = 20;
            $fcQuery = $category->flashcards()->where('is_published', true);
            if ($sectionId && Schema::hasColumn('flashcards', 'section_id')) {
                $sectionFcCount2 = (clone $fcQuery)->where('section_id', $sectionId)->count();
                if ($sectionFcCount2 > 0) {
                    $fcQuery->where('section_id', $sectionId);
                } else {
                    $fcQuery->whereNull('section_id');
                }
            }
            // For image-choice quizzes, only use flashcards that have a valid image
            if ($difficulty === 'katamtaman') {
                $fcQuery->whereNotNull('image_url')->where('image_url', '!=', '');
            }
            $flashcards = $fcQuery->get();
            if ($sectionId) {
                $flashcards = $flashcards->sortByDesc(fn ($fc) => $fc->section_id ? 1 : 0)
                    ->unique(fn ($fc) => mb_strtolower(trim($fc->filipino_name ?: $fc->name), 'UTF-8'))
                    ->values();
            }
            if ($flashcards->isNotEmpty()) {
                $allFlashcards = $flashcards->all();
                $existingCount = $formattedQuestions->count();
                $needed = $targetCount - $existingCount;
                for ($i = 0; $i < $needed; $i++) {
                    $targetFc = $allFlashcards[$i % count($allFlashcards)];
                    $otherFcs = array_values(array_filter($allFlashcards, fn ($f) => $f->id !== $targetFc->id));
                    shuffle($otherFcs);
                    $choiceFcs = array_merge([$targetFc], array_slice($otherFcs, 0, min(3, count($otherFcs))));
                    shuffle($choiceFcs);

                    $choices = array_map(function ($f) use ($resolveUrl) {
                        return [
                            'id' => (string) $f->id,
                            'image_url' => $resolveUrl((string) ($f->image_url ?? '')),
                            'text' => $f->filipino_name,
                        ];
                    }, $choiceFcs);

                    $qText = ($difficulty === 'katamtaman')
                        ? 'Nasaan ang '.strtolower($targetFc->filipino_name).'?'
                        : 'Ayusin ang mga letra.';

                    $correctAnswer = ($difficulty === 'katamtaman')
                        ? (string) $targetFc->id
                        : strtoupper($targetFc->filipino_name);

                    $formattedQuestions->push([
                        'id' => 10000 + $i,
                        'flashcard_id' => $targetFc->id,
                        'question_text' => $qText,
                        'audio_url' => $resolveUrl((string) ($targetFc->audio_url ?? '')),
                        'target_image_url' => $resolveUrl((string) ($targetFc->image_url ?? '')),
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
