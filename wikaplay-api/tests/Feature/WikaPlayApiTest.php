<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Flashcard;
use App\Models\QuizAvailability;
use App\Models\QuizQuestion;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class WikaPlayApiTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // Seed database if empty
        if (Category::count() === 0) {
            $this->artisan('db:seed', ['--class' => 'WikaPlaySeeder']);
        }
    }

    public function test_student_and_teacher_can_login(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'student@wikaplay.ph',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'role', 'stars_balance']]);

        $this->assertEquals('student', $response->json('user.role'));
    }

    public function test_categories_api_returns_published_categories(): void
    {
        $response = $this->getJson('/api/categories');

        $response->assertStatus(200)
            ->assertJsonStructure(['categories' => [['id', 'slug', 'name', 'color', 'flashcards_count']]]);

        $this->assertGreaterThan(0, count($response->json('categories')));
    }

    public function test_katamtaman_quiz_uses_picture_choices_and_reuses_flashcard_audio(): void
    {
        $category = Category::where('slug', 'mga-hayop')->first();
        $this->assertNotNull($category);

        $response = $this->getJson("/api/categories/{$category->slug}/quizzes/katamtaman");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'category',
                'difficulty',
                'questions' => [
                    [
                        'id',
                        'flashcard_id',
                        'audio_url',
                        'choices' => [
                            ['id', 'image_url', 'text']
                        ],
                        'correct_answer'
                    ]
                ]
            ]);

        $questions = $response->json('questions');
        $this->assertNotEmpty($questions);

        $firstQ = $questions[0];
        $this->assertNotNull($firstQ['flashcard_id']);
        $this->assertNotEmpty($firstQ['audio_url']);

        // Check Katamtaman rules: choices text must be blank (picture only!)
        foreach ($firstQ['choices'] as $choice) {
            $this->assertEquals('', $choice['text']);
            $this->assertNotEmpty($choice['image_url']);
        }
    }

    public function test_locked_quiz_rejects_student_attempts(): void
    {
        $category = Category::where('slug', 'mga-hayop')->first();
        QuizAvailability::updateOrCreate(
            ['category_id' => $category->id, 'difficulty' => 'madali'],
            ['is_locked' => true]
        );

        $response = $this->getJson("/api/categories/{$category->slug}/quizzes/madali");
        $response->assertStatus(403);

        // Unlock back
        QuizAvailability::updateOrCreate(
            ['category_id' => $category->id, 'difficulty' => 'madali'],
            ['is_locked' => false]
        );
    }

    public function test_student_cannot_access_teacher_endpoints(): void
    {
        $student = User::where('role', 'student')->first();
        $token = $student->createToken('test_student_token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/teacher/students');

        $response->assertStatus(403);
    }

    public function test_teacher_can_access_student_monitoring(): void
    {
        $teacher = User::where('role', 'teacher')->first();
        $token = $teacher->createToken('test_teacher_token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/teacher/students');

        $response->assertStatus(200)
            ->assertJsonStructure(['students', 'total_students', 'online_count']);
    }
}
