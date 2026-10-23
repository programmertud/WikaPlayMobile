<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\MinigameController;
use App\Http\Controllers\Api\PresenceController;
use App\Http\Controllers\Api\QuizController;
use App\Http\Controllers\Api\RewardController;
use App\Http\Controllers\Api\StudentProfileController;
use App\Http\Controllers\Api\TeacherController;
use Illuminate\Support\Facades\Route;

// Public Authentication
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/student-login', [AuthController::class, 'studentLogin']);
    Route::post('/student-register', [AuthController::class, 'studentRegister']);
});

// Public / Cached Content (Accessible to students without requiring heavy auth token, or with token)
Route::prefix('categories')->group(function () {
    Route::get('/', [CategoryController::class, 'index']);
    Route::get('/{slug}', [CategoryController::class, 'show']);
    Route::get('/{slug}/flashcards', [CategoryController::class, 'flashcards']);
    Route::get('/{slug}/quizzes/{difficulty}', [CategoryController::class, 'getQuizQuestions']);
});

Route::prefix('minigames')->group(function () {
    Route::get('/', [MinigameController::class, 'index']);
    Route::get('/{gameType}/content', [MinigameController::class, 'getContent']);
});

// Authenticated Routes (Sanctum)
Route::middleware('auth:sanctum')->group(function () {
    // Current User & Presence
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/presence/heartbeat', [PresenceController::class, 'heartbeat']);

    // Student Profile & Detailed Aggregated Statistics
    Route::prefix('student')->group(function () {
        Route::get('/profile-stats', [StudentProfileController::class, 'profileStats']);
        Route::put('/avatar', [StudentProfileController::class, 'updateAvatar']);
    });

    // Quizzes Gameplay & Submission
    Route::prefix('quizzes')->group(function () {
        Route::post('/submit', [QuizController::class, 'submit']);
        Route::get('/history', [QuizController::class, 'history']);
    });

    // Mini-games Submission
    Route::post('/minigames/submit', [MinigameController::class, 'submit']);

    // Rewards & Collectibles (Gantimpala & Nakolekta)
    Route::prefix('rewards')->group(function () {
        Route::get('/collectibles', [RewardController::class, 'collectibles']);
        Route::post('/unlock-mystery', [RewardController::class, 'unlockMystery']);
        Route::get('/stars-history', [RewardController::class, 'starsHistory']);
        Route::get('/achievements', [RewardController::class, 'achievements']);
        Route::post('/claim-badge', [RewardController::class, 'claimBadge']);
    });

    // Teacher Management (Protected role: teacher/admin)
    Route::prefix('teacher')->group(function () {
        Route::get('/dashboard', [TeacherController::class, 'dashboardStats']);
        Route::get('/students', [TeacherController::class, 'students']);
        Route::get('/students/{id}/history', [TeacherController::class, 'studentHistory']);
        Route::match(['put', 'patch'], '/students/{id}/status', [TeacherController::class, 'updateStudentStatus']);
        Route::get('/categories', [TeacherController::class, 'categories']);
        Route::post('/categories', [TeacherController::class, 'saveCategory']);
        Route::post('/flashcards', [TeacherController::class, 'saveFlashcard']);
        Route::delete('/flashcards/{id}', [TeacherController::class, 'deleteFlashcard']);
        Route::post('/quizzes/toggle-lock', [TeacherController::class, 'toggleQuizLock']);
        Route::get('/quizzes/{categoryId}/{difficulty}', [TeacherController::class, 'getQuizQuestions']);
        Route::post('/quizzes/question', [TeacherController::class, 'saveQuizQuestion']);
        Route::delete('/quizzes/question/{id}', [TeacherController::class, 'deleteQuizQuestion']);
        Route::get('/reports/export-csv', [TeacherController::class, 'exportReportsCsv']);
        Route::post('/upload-audio', [TeacherController::class, 'uploadAudio']);
        Route::post('/upload-image', [TeacherController::class, 'uploadImage']);
    });
});
