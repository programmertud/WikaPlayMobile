<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Collectible;
use App\Models\Flashcard;
use App\Models\QuizAvailability;
use App\Models\QuizQuestion;
use App\Models\StarTransaction;
use App\Models\StudentCollectible;
use App\Models\StudentPresence;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class WikaPlaySeeder extends Seeder
{
    public function run(): void
    {
        // 1. Seed Default Users
        $student = User::firstOrCreate(
            ['email' => 'student@wikaplay.ph'],
            [
                'name' => 'Juan Dela Cruz',
                'password' => Hash::make('password123'),
                'role' => 'student',
                'avatar' => 'https://api.dicebear.com/7.x/bottts/png?seed=Juan&backgroundColor=38bdf8',
                'section' => 'Kinder - Masayahin',
                'stars_balance' => 25,
            ]
        );

        $teacher = User::firstOrCreate(
            ['email' => 'teacher@wikaplay.ph'],
            [
                'name' => 'Guro Maria Santos',
                'password' => Hash::make('password123'),
                'role' => 'teacher',
                'avatar' => 'https://api.dicebear.com/7.x/avataaars/png?seed=Maria&backgroundColor=fbbf24',
                'section' => 'Kinder - Masayahin',
                'stars_balance' => 0,
            ]
        );

        // Initial presence for student
        StudentPresence::firstOrCreate(
            ['user_id' => $student->id],
            [
                'is_online' => false,
                'current_activity' => 'Handang mag-aral',
                'current_screen' => 'dashboard',
                'session_started_at' => now(),
                'last_active_at' => now(),
            ]
        );

        // 2. Categories Data
        $categoriesData = [
            [
                'slug' => 'mga-hayop',
                'name' => 'Mga Hayop',
                'title' => 'Tuklasin ang mga Hayop',
                'description' => 'Alamin ang mga pangalan at tunog ng iba\'t ibang hayop sa paligid.',
                'cover_image' => 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=400&q=80',
                'color' => '#10B981', // Emerald green
                'sort_order' => 1,
                'items' => [
                    ['name' => 'Aso', 'filipino' => 'Aso', 'english' => 'Dog', 'image' => 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&q=80', 'audio' => 'audio/hayop_aso.mp3'],
                    ['name' => 'Pusa', 'filipino' => 'Pusa', 'english' => 'Cat', 'image' => 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&q=80', 'audio' => 'audio/hayop_pusa.mp3'],
                    ['name' => 'Ibon', 'filipino' => 'Ibon', 'english' => 'Bird', 'image' => 'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=400&q=80', 'audio' => 'audio/hayop_ibon.mp3'],
                    ['name' => 'Kalabaw', 'filipino' => 'Kalabaw', 'english' => 'Carabao', 'image' => 'https://images.unsplash.com/photo-1589656966895-2f33e7653819?w=400&q=80', 'audio' => 'audio/hayop_kalabaw.mp3'],
                ]
            ],
            [
                'slug' => 'mga-prutas',
                'name' => 'Mga Prutas',
                'title' => 'Masusustansyang Prutas',
                'description' => 'Kilalanin ang mga matatamis at masasarap na prutas.',
                'cover_image' => 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&q=80',
                'color' => '#F59E0B', // Amber
                'sort_order' => 2,
                'items' => [
                    ['name' => 'Mangga', 'filipino' => 'Mangga', 'english' => 'Mango', 'image' => 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=400&q=80', 'audio' => 'audio/prutas_mangga.mp3'],
                    ['name' => 'Saging', 'filipino' => 'Saging', 'english' => 'Banana', 'image' => 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&q=80', 'audio' => 'audio/prutas_saging.mp3'],
                    ['name' => 'Pakwan', 'filipino' => 'Pakwan', 'english' => 'Watermelon', 'image' => 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&q=80', 'audio' => 'audio/prutas_pakwan.mp3'],
                    ['name' => 'Mansanas', 'filipino' => 'Mansanas', 'english' => 'Apple', 'image' => 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&q=80', 'audio' => 'audio/prutas_mansanas.mp3'],
                ]
            ],
            [
                'slug' => 'mga-gulay',
                'name' => 'Mga Gulay',
                'title' => 'Sariwang mga Gulay',
                'description' => 'Maging malakas at malusog sa pagkain ng gulay!',
                'cover_image' => 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&q=80',
                'color' => '#16A34A', // Green
                'sort_order' => 3,
                'items' => [
                    ['name' => 'Talong', 'filipino' => 'Talong', 'english' => 'Eggplant', 'image' => 'https://images.unsplash.com/photo-1628773822503-930a84d4128f?w=400&q=80', 'audio' => 'audio/gulay_talong.mp3'],
                    ['name' => 'Kalabasa', 'filipino' => 'Kalabasa', 'english' => 'Squash', 'image' => 'https://images.unsplash.com/photo-1570586437263-ab629fccc818?w=400&q=80', 'audio' => 'audio/gulay_kalabasa.mp3'],
                    ['name' => 'Sitaw', 'filipino' => 'Sitaw', 'english' => 'String beans', 'image' => 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400&q=80', 'audio' => 'audio/gulay_sitaw.mp3'],
                    ['name' => 'Kamatis', 'filipino' => 'Kamatis', 'english' => 'Tomato', 'image' => 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&q=80', 'audio' => 'audio/gulay_kamatis.mp3'],
                ]
            ],
            [
                'slug' => 'mga-bilang',
                'name' => 'Mga Bilang',
                'title' => 'Magbilang Tayo (1-10)',
                'description' => 'Matutong magbilang mula isa hanggang sampu.',
                'cover_image' => 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400&q=80',
                'color' => '#3B82F6', // Blue
                'sort_order' => 4,
                'items' => [
                    ['name' => 'Isa (1)', 'filipino' => 'Isa', 'english' => 'One (1)', 'image' => 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&q=80', 'audio' => 'audio/bilang_isa.mp3'],
                    ['name' => 'Dalawa (2)', 'filipino' => 'Dalawa', 'english' => 'Two (2)', 'image' => 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=400&q=80', 'audio' => 'audio/bilang_dalawa.mp3'],
                    ['name' => 'Tatlo (3)', 'filipino' => 'Tatlo', 'english' => 'Three (3)', 'image' => 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400&q=80', 'audio' => 'audio/bilang_tatlo.mp3'],
                    ['name' => 'Apat (4)', 'filipino' => 'Apat', 'english' => 'Four (4)', 'image' => 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80', 'audio' => 'audio/bilang_apat.mp3'],
                ]
            ],
            [
                'slug' => 'mga-hugis',
                'name' => 'Mga Hugis',
                'title' => 'Iba\'t Ibang Hugis',
                'description' => 'Bilog, parisukat, tatsulok, at parihaba.',
                'cover_image' => 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=400&q=80',
                'color' => '#8B5CF6', // Purple
                'sort_order' => 5,
                'items' => [
                    ['name' => 'Bilog', 'filipino' => 'Bilog', 'english' => 'Circle', 'image' => 'https://images.unsplash.com/photo-1558865869-c93f6f8482af?w=400&q=80', 'audio' => 'audio/hugis_bilog.mp3'],
                    ['name' => 'Parisukat', 'filipino' => 'Parisukat', 'english' => 'Square', 'image' => 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=400&q=80', 'audio' => 'audio/hugis_parisukat.mp3'],
                    ['name' => 'Tatsulok', 'filipino' => 'Tatsulok', 'english' => 'Triangle', 'image' => 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=400&q=80', 'audio' => 'audio/hugis_tatsulok.mp3'],
                    ['name' => 'Parihaba', 'filipino' => 'Parihaba', 'english' => 'Rectangle', 'image' => 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=400&q=80', 'audio' => 'audio/hugis_parihaba.mp3'],
                ]
            ],
            [
                'slug' => 'mga-kulay',
                'name' => 'Mga Kulay',
                'title' => 'Makukulay na Bagay',
                'description' => 'Pula, asul, dilaw, at marami pang iba!',
                'cover_image' => 'https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?w=400&q=80',
                'color' => '#EC4899', // Pink
                'sort_order' => 6,
                'items' => [
                    ['name' => 'Pula', 'filipino' => 'Pula', 'english' => 'Red', 'image' => 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=400&q=80', 'audio' => 'audio/kulay_pula.mp3'],
                    ['name' => 'Asul', 'filipino' => 'Asul', 'english' => 'Blue', 'image' => 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80', 'audio' => 'audio/kulay_asul.mp3'],
                    ['name' => 'Dilaw', 'filipino' => 'Dilaw', 'english' => 'Yellow', 'image' => 'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?w=400&q=80', 'audio' => 'audio/kulay_dilaw.mp3'],
                    ['name' => 'Berde', 'filipino' => 'Berde', 'english' => 'Green', 'image' => 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=400&q=80', 'audio' => 'audio/kulay_berde.mp3'],
                ]
            ],
            [
                'slug' => 'bahagi-ng-katawan',
                'name' => 'Mga Bahagi ng Katawan',
                'title' => 'Ang Aking Katawan',
                'description' => 'Mata, tainga, ilong, bibig, kamay, at paa.',
                'cover_image' => 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=400&q=80',
                'color' => '#06B6D4', // Cyan
                'sort_order' => 7,
                'items' => [
                    ['name' => 'Mata', 'filipino' => 'Mata', 'english' => 'Eye', 'image' => 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=400&q=80', 'audio' => 'audio/katawan_mata.mp3'],
                    ['name' => 'Ilong', 'filipino' => 'Ilong', 'english' => 'Nose', 'image' => 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80', 'audio' => 'audio/katawan_ilong.mp3'],
                    ['name' => 'Bibig', 'filipino' => 'Bibig', 'english' => 'Mouth', 'image' => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80', 'audio' => 'audio/katawan_bibig.mp3'],
                    ['name' => 'Kamay', 'filipino' => 'Kamay', 'english' => 'Hand', 'image' => 'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=400&q=80', 'audio' => 'audio/katawan_kamay.mp3'],
                ]
            ],
            [
                'slug' => 'mga-pagbati',
                'name' => 'Mga Pagbati at Parirala',
                'title' => 'Magagalang na Pagbati',
                'description' => 'Magandang umaga, salamat, at iba pang magagalang na salita.',
                'cover_image' => 'https://images.unsplash.com/photo-1485546246426-74dc88dec4d9?w=400&q=80',
                'color' => '#F43F5E', // Rose
                'sort_order' => 8,
                'items' => [
                    ['name' => 'Magandang Umaga', 'filipino' => 'Magandang Umaga', 'english' => 'Good Morning', 'image' => 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=80', 'audio' => 'audio/pagbati_umaga.mp3'],
                    ['name' => 'Salamat', 'filipino' => 'Salamat', 'english' => 'Thank You', 'image' => 'https://images.unsplash.com/photo-1516726817505-f5ed825624d8?w=400&q=80', 'audio' => 'audio/pagbati_salamat.mp3'],
                    ['name' => 'Kamusta', 'filipino' => 'Kamusta', 'english' => 'Hello / How are you', 'image' => 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=400&q=80', 'audio' => 'audio/pagbati_kamusta.mp3'],
                    ['name' => 'Paalam', 'filipino' => 'Paalam', 'english' => 'Goodbye', 'image' => 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&q=80', 'audio' => 'audio/pagbati_paalam.mp3'],
                ]
            ]
        ];

        foreach ($categoriesData as $catData) {
            $category = Category::firstOrCreate(
                ['slug' => $catData['slug']],
                [
                    'name' => $catData['name'],
                    'title' => $catData['title'],
                    'description' => $catData['description'],
                    'cover_image' => $catData['cover_image'],
                    'color' => $catData['color'],
                    'is_published' => true,
                    'sort_order' => $catData['sort_order'],
                ]
            );

            // Seed Quiz Availabilities
            foreach (['madali', 'katamtaman', 'mahirap'] as $diff) {
                QuizAvailability::firstOrCreate(
                    [
                        'category_id' => $category->id,
                        'difficulty' => $diff,
                    ],
                    [
                        'is_locked' => false,
                        'pass_score' => 3,
                    ]
                );
            }

            // Seed Flashcards
            $seededFlashcards = [];
            foreach ($catData['items'] as $idx => $item) {
                $flashcard = Flashcard::firstOrCreate(
                    [
                        'category_id' => $category->id,
                        'filipino_name' => $item['filipino'],
                    ],
                    [
                        'name' => $item['name'],
                        'english_name' => $item['english'],
                        'image_url' => $item['image'],
                        'audio_url' => $item['audio'],
                        'is_published' => true,
                        'sort_order' => $idx + 1,
                    ]
                );
                $seededFlashcards[] = $flashcard;
            }

            // Seed Quizzes:
            // 1) Madali: Multiple choice with text and image prompt
            if (count($seededFlashcards) >= 3) {
                foreach ($seededFlashcards as $qIdx => $fc) {
                    $choices = [];
                    $choices[] = ['id' => $fc->filipino_name, 'text' => $fc->filipino_name, 'image_url' => $fc->image_url];
                    foreach ($seededFlashcards as $otherFc) {
                        if ($otherFc->id !== $fc->id && count($choices) < 3) {
                            $choices[] = ['id' => $otherFc->filipino_name, 'text' => $otherFc->filipino_name, 'image_url' => $otherFc->image_url];
                        }
                    }
                    shuffle($choices);

                    QuizQuestion::firstOrCreate(
                        [
                            'category_id' => $category->id,
                            'difficulty' => 'madali',
                            'target_item_name' => $fc->filipino_name,
                        ],
                        [
                            'flashcard_id' => $fc->id,
                            'question_text' => 'Ano ang nasa larawan?',
                            'target_image_url' => $fc->image_url,
                            'audio_url' => $fc->audio_url,
                            'choices' => $choices,
                            'correct_answer' => $fc->filipino_name,
                            'points' => 1,
                            'sort_order' => $qIdx + 1,
                        ]
                    );
                }
            }

            // 2) Katamtaman: SPECIAL AUDIO-BASED PICTURE QUIZ
            // Critical rule: Reuses flashcard audio, choices are PICTURE ONLY without text labels!
            if (count($seededFlashcards) >= 3) {
                foreach ($seededFlashcards as $qIdx => $fc) {
                    $choices = [];
                    // Note: choices contain id and image_url, NO text displayed
                    $choices[] = [
                        'id' => (string)$fc->id,
                        'image_url' => $fc->image_url,
                        'text' => '', // NO written target label in Katamtaman
                    ];

                    foreach ($seededFlashcards as $otherFc) {
                        if ($otherFc->id !== $fc->id && count($choices) < 4) {
                            $choices[] = [
                                'id' => (string)$otherFc->id,
                                'image_url' => $otherFc->image_url,
                                'text' => '',
                            ];
                        }
                    }
                    shuffle($choices);

                    QuizQuestion::firstOrCreate(
                        [
                            'category_id' => $category->id,
                            'difficulty' => 'katamtaman',
                            'target_item_name' => $fc->filipino_name,
                        ],
                        [
                            // CRITICAL: Links directly to flashcard so teacher edits automatically sync!
                            'flashcard_id' => $fc->id,
                            'question_text' => '', // Picture-only question, no written hint
                            'target_image_url' => $fc->image_url,
                            'audio_url' => $fc->audio_url,
                            'choices' => $choices,
                            'correct_answer' => (string)$fc->id,
                            'points' => 2,
                            'sort_order' => $qIdx + 1,
                        ]
                    );
                }
            }

            // 3) Mahirap: Word spelling / Audio identification
            if (count($seededFlashcards) >= 2) {
                foreach ($seededFlashcards as $qIdx => $fc) {
                    $choices = [];
                    $choices[] = ['id' => $fc->filipino_name, 'text' => $fc->filipino_name, 'image_url' => $fc->image_url];
                    foreach ($seededFlashcards as $otherFc) {
                        if ($otherFc->id !== $fc->id && count($choices) < 4) {
                            $choices[] = ['id' => $otherFc->filipino_name, 'text' => $otherFc->filipino_name, 'image_url' => $otherFc->image_url];
                        }
                    }
                    shuffle($choices);

                    QuizQuestion::firstOrCreate(
                        [
                            'category_id' => $category->id,
                            'difficulty' => 'mahirap',
                            'target_item_name' => $fc->filipino_name,
                        ],
                        [
                            'flashcard_id' => $fc->id,
                            'question_text' => 'Piliin ang wastong salita:',
                            'target_image_url' => $fc->image_url,
                            'audio_url' => $fc->audio_url,
                            'choices' => $choices,
                            'correct_answer' => $fc->filipino_name,
                            'points' => 3,
                            'sort_order' => $qIdx + 1,
                        ]
                    );
                }
            }
        }

        // 3. Seed Collectibles (Gantimpala mystery items)
        $collectiblesData = [
            [
                'slug' => 'gintong-agila',
                'name' => 'Gintong Agila ng Pilipinas',
                'filipino_name' => 'Gintong Agila',
                'description' => 'Ang hari ng himpapawid! Simbolo ng tapang at talino ng batang Pilipino.',
                'image_url' => 'https://images.unsplash.com/photo-1611689342806-0863700ce8e4?w=400&q=80',
                'rarity' => 'legendary',
                'required_stars' => 10,
            ],
            [
                'slug' => 'tarsier-bohol',
                'name' => 'Tarsier ng Bohol',
                'filipino_name' => 'Maliit na Tarsier',
                'description' => 'Mataas tumalon at may malalaking matang mapagmasid sa gabi.',
                'image_url' => 'https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?w=400&q=80',
                'rarity' => 'epic',
                'required_stars' => 8,
            ],
            [
                'slug' => 'bituing-marikit',
                'name' => 'Bituing Marikit',
                'filipino_name' => 'Kumukutikutitap na Bituin',
                'description' => 'Gantimpala para sa mag-aaral na laging masigasig at masipag.',
                'image_url' => 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80',
                'rarity' => 'rare',
                'required_stars' => 5,
            ],
            [
                'slug' => 'sampaguita-crown',
                'name' => 'Kuwintas ng Sampaguita',
                'filipino_name' => 'Mabangong Sampaguita',
                'description' => 'Pambansang bulaklak na sumisimbolo sa kalinisan at kagandahang-asal.',
                'image_url' => 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=400&q=80',
                'rarity' => 'common',
                'required_stars' => 3,
            ],
            [
                'slug' => 'jeepney-toy',
                'name' => 'Munting Jeepney',
                'filipino_name' => 'Makulay na Jeepney',
                'description' => 'Sakay na sa biyahe ng karunungan kasama ang WikaPlay!',
                'image_url' => 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&q=80',
                'rarity' => 'common',
                'required_stars' => 3,
            ],
        ];

        foreach ($collectiblesData as $cData) {
            $collectible = Collectible::firstOrCreate(
                ['slug' => $cData['slug']],
                [
                    'name' => $cData['name'],
                    'filipino_name' => $cData['filipino_name'],
                    'description' => $cData['description'],
                    'image_url' => $cData['image_url'],
                    'rarity' => $cData['rarity'],
                    'required_stars' => $cData['required_stars'],
                ]
            );

            // Give the student user 2 initial unlocked collectibles
            if (in_array($cData['slug'], ['sampaguita-crown', 'bituing-marikit'])) {
                StudentCollectible::firstOrCreate(
                    [
                        'user_id' => $student->id,
                        'collectible_id' => $collectible->id,
                    ],
                    [
                        'unlocked_at' => now()->subDay(),
                        'is_mystery_revealed' => true,
                    ]
                );
            }
        }

        // Seed initial star transactions
        StarTransaction::firstOrCreate(
            [
                'user_id' => $student->id,
                'source_type' => 'welcome_bonus',
            ],
            [
                'amount' => 25,
                'balance_after' => 25,
                'source_id' => null,
                'description' => 'Maligayang pagdating sa WikaPlay!',
            ]
        );
    }
}
