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
                'title' => 'Mga Hayop',
                'description' => 'Kilalanin ang mga hayop sa paligid at kalikasan.',
                'cover_image' => '',
                'color' => '#38BDF8',
                'sort_order' => 1,
                'items' => [
                    ['name' => 'Aso', 'filipino' => 'Aso', 'english' => 'Dog', 'image' => '', 'audio' => 'audio/mga-hayop_aso.mp3'],
                    ['name' => 'Pusa', 'filipino' => 'Pusa', 'english' => 'Cat', 'image' => '', 'audio' => 'audio/mga-hayop_pusa.mp3'],
                    ['name' => 'Ahas', 'filipino' => 'Ahas', 'english' => 'Snake', 'image' => '', 'audio' => 'audio/mga-hayop_ahas.mp3'],
                    ['name' => 'Baboy', 'filipino' => 'Baboy', 'english' => 'Pig', 'image' => '', 'audio' => 'audio/mga-hayop_baboy.mp3'],
                    ['name' => 'Bubuyog', 'filipino' => 'Bubuyog', 'english' => 'Bee', 'image' => '', 'audio' => 'audio/mga-hayop_bubuyog.mp3'],
                    ['name' => 'Daga', 'filipino' => 'Daga', 'english' => 'Mouse', 'image' => '', 'audio' => 'audio/mga-hayop_daga.mp3'],
                    ['name' => 'Gagamba', 'filipino' => 'Gagamba', 'english' => 'Spider', 'image' => '', 'audio' => 'audio/mga-hayop_gagamba.mp3'],
                    ['name' => 'Ibon', 'filipino' => 'Ibon', 'english' => 'Bird', 'image' => '', 'audio' => 'audio/mga-hayop_ibon.mp3'],
                    ['name' => 'Isda', 'filipino' => 'Isda', 'english' => 'Fish', 'image' => '', 'audio' => 'audio/mga-hayop_isda.mp3'],
                    ['name' => 'Kabayo', 'filipino' => 'Kabayo', 'english' => 'Horse', 'image' => '', 'audio' => 'audio/mga-hayop_kabayo.mp3'],
                    ['name' => 'Kalabaw', 'filipino' => 'Kalabaw', 'english' => 'Carabao', 'image' => '', 'audio' => 'audio/mga-hayop_kalabaw.mp3'],
                    ['name' => 'Kambing', 'filipino' => 'Kambing', 'english' => 'Goat', 'image' => '', 'audio' => 'audio/mga-hayop_kambing.mp3'],
                    ['name' => 'Leon', 'filipino' => 'Leon', 'english' => 'Lion', 'image' => '', 'audio' => 'audio/mga-hayop_leon.mp3'],
                    ['name' => 'Manok', 'filipino' => 'Manok', 'english' => 'Chicken', 'image' => '', 'audio' => 'audio/mga-hayop_manok.mp3'],
                    ['name' => 'Pagong', 'filipino' => 'Pagong', 'english' => 'Turtle', 'image' => '', 'audio' => 'audio/mga-hayop_pagong.mp3'],
                    ['name' => 'Palaka', 'filipino' => 'Palaka', 'english' => 'Frog', 'image' => '', 'audio' => 'audio/mga-hayop_palaka.mp3'],
                    ['name' => 'Pating', 'filipino' => 'Pating', 'english' => 'Shark', 'image' => '', 'audio' => 'audio/mga-hayop_pating.mp3'],
                    ['name' => 'Pugita', 'filipino' => 'Pugita', 'english' => 'Octopus', 'image' => '', 'audio' => 'audio/mga-hayop_pugita.mp3'],
                    ['name' => 'Tigre', 'filipino' => 'Tigre', 'english' => 'Tiger', 'image' => '', 'audio' => 'audio/mga-hayop_tigre.mp3'],
                    ['name' => 'Unggoy', 'filipino' => 'Unggoy', 'english' => 'Monkey', 'image' => '', 'audio' => 'audio/mga-hayop_unggoy.mp3'],
                ]
            ],
            [
                'slug' => 'mga-prutas',
                'name' => 'Mga Prutas',
                'title' => 'Mga Prutas',
                'description' => 'Matatamis at masustansyang mga prutas.',
                'cover_image' => '',
                'color' => '#FB923C',
                'sort_order' => 2,
                'items' => [
                    ['name' => 'Abukado', 'filipino' => 'Abukado', 'english' => 'Avocado', 'image' => '', 'audio' => 'audio/mga-prutas_abukado.mp3'],
                    ['name' => 'Atis', 'filipino' => 'Atis', 'english' => 'Sugar apple', 'image' => '', 'audio' => 'audio/mga-prutas_atis.mp3'],
                    ['name' => 'Balimbing', 'filipino' => 'Balimbing', 'english' => 'Star fruit', 'image' => '', 'audio' => 'audio/mga-prutas_balimbing.mp3'],
                    ['name' => 'Bayabas', 'filipino' => 'Bayabas', 'english' => 'Guava', 'image' => '', 'audio' => 'audio/mga-prutas_bayabas.mp3'],
                    ['name' => 'Buko', 'filipino' => 'Buko', 'english' => 'Young coconut', 'image' => '', 'audio' => 'audio/mga-prutas_buko.mp3'],
                    ['name' => 'Durian', 'filipino' => 'Durian', 'english' => 'Durian', 'image' => '', 'audio' => 'audio/mga-prutas_durian.mp3'],
                    ['name' => 'Kakao', 'filipino' => 'Kakao', 'english' => 'Cacao', 'image' => '', 'audio' => 'audio/mga-prutas_kakao.mp3'],
                    ['name' => 'Langka', 'filipino' => 'Langka', 'english' => 'Jackfruit', 'image' => '', 'audio' => 'audio/mga-prutas_langka.mp3'],
                    ['name' => 'Mangga', 'filipino' => 'Mangga', 'english' => 'Mango', 'image' => '', 'audio' => 'audio/mga-prutas_mangga.mp3'],
                    ['name' => 'Mansanas', 'filipino' => 'Mansanas', 'english' => 'Apple', 'image' => '', 'audio' => 'audio/mga-prutas_mansanas.mp3'],
                    ['name' => 'Melon', 'filipino' => 'Melon', 'english' => 'Melon', 'image' => '', 'audio' => 'audio/mga-prutas_melon.mp3'],
                    ['name' => 'Pakwan', 'filipino' => 'Pakwan', 'english' => 'Watermelon', 'image' => '', 'audio' => 'audio/mga-prutas_pakwan.mp3'],
                    ['name' => 'Papaya', 'filipino' => 'Papaya', 'english' => 'Papaya', 'image' => '', 'audio' => 'audio/mga-prutas_papaya.mp3'],
                    ['name' => 'Peras', 'filipino' => 'Peras', 'english' => 'Pear', 'image' => '', 'audio' => 'audio/mga-prutas_peras.mp3'],
                    ['name' => 'Presas', 'filipino' => 'Presas', 'english' => 'Strawberry', 'image' => '', 'audio' => 'audio/mga-prutas_presas.mp3'],
                    ['name' => 'Rambutan', 'filipino' => 'Rambutan', 'english' => 'Rambutan', 'image' => '', 'audio' => 'audio/mga-prutas_rambutan.mp3'],
                    ['name' => 'Saging', 'filipino' => 'Saging', 'english' => 'Banana', 'image' => '', 'audio' => 'audio/mga-prutas_saging.mp3'],
                    ['name' => 'Santol', 'filipino' => 'Santol', 'english' => 'Cotton fruit', 'image' => '', 'audio' => 'audio/mga-prutas_santol.mp3'],
                    ['name' => 'Seresa', 'filipino' => 'Seresa', 'english' => 'Cherry', 'image' => '', 'audio' => 'audio/mga-prutas_seresa.mp3'],
                    ['name' => 'Ubas', 'filipino' => 'Ubas', 'english' => 'Grapes', 'image' => '', 'audio' => 'audio/mga-prutas_ubas.mp3'],
                ]
            ],
            [
                'slug' => 'mga-gulay',
                'name' => 'Mga Gulay',
                'title' => 'Mga Gulay',
                'description' => 'Masusustansyang gulay para sa malusog na katawan.',
                'cover_image' => '',
                'color' => '#4ADE80',
                'sort_order' => 3,
                'items' => [
                    ['name' => 'Ampalaya', 'filipino' => 'Ampalaya', 'english' => 'Bitter gourd', 'image' => '', 'audio' => 'audio/mga-gulay_ampalaya.mp3'],
                    ['name' => 'Bawang', 'filipino' => 'Bawang', 'english' => 'Garlic', 'image' => '', 'audio' => 'audio/mga-gulay_bawang.mp3'],
                    ['name' => 'Brokoli', 'filipino' => 'Brokoli', 'english' => 'Broccoli', 'image' => '', 'audio' => 'audio/mga-gulay_brokoli.mp3'],
                    ['name' => 'Repolyo', 'filipino' => 'Repolyo', 'english' => 'Cabbage', 'image' => '', 'audio' => 'audio/mga-gulay_repolyo.mp3'],
                    ['name' => 'Espinaka', 'filipino' => 'Espinaka', 'english' => 'Spinach', 'image' => '', 'audio' => 'audio/mga-gulay_espinaka.mp3'],
                    ['name' => 'Kalabasa', 'filipino' => 'Kalabasa', 'english' => 'Squash', 'image' => '', 'audio' => 'audio/mga-gulay_kalabasa.mp3'],
                    ['name' => 'Kamatis', 'filipino' => 'Kamatis', 'english' => 'Tomato', 'image' => '', 'audio' => 'audio/mga-gulay_kamatis.mp3'],
                    ['name' => 'Kangkong', 'filipino' => 'Kangkong', 'english' => 'Water spinach', 'image' => '', 'audio' => 'audio/mga-gulay_kangkong.mp3'],
                    ['name' => 'Karot', 'filipino' => 'Karot', 'english' => 'Carrot', 'image' => '', 'audio' => 'audio/mga-gulay_karot.mp3'],
                    ['name' => 'Koliplor', 'filipino' => 'Koliplor', 'english' => 'Cauliflower', 'image' => '', 'audio' => 'audio/mga-gulay_koliplor.mp3'],
                    ['name' => 'Labanos', 'filipino' => 'Labanos', 'english' => 'Radish', 'image' => '', 'audio' => 'audio/mga-gulay_labanos.mp3'],
                    ['name' => 'Luya', 'filipino' => 'Luya', 'english' => 'Ginger', 'image' => '', 'audio' => 'audio/mga-gulay_luya.mp3'],
                    ['name' => 'Mais', 'filipino' => 'Mais', 'english' => 'Corn', 'image' => '', 'audio' => 'audio/mga-gulay_mais.mp3'],
                    ['name' => 'Okra', 'filipino' => 'Okra', 'english' => 'Okra', 'image' => '', 'audio' => 'audio/mga-gulay_okra.mp3'],
                    ['name' => 'Patatas', 'filipino' => 'Patatas', 'english' => 'Potato', 'image' => '', 'audio' => 'audio/mga-gulay_patatas.mp3'],
                    ['name' => 'Pipino', 'filipino' => 'Pipino', 'english' => 'Cucumber', 'image' => '', 'audio' => 'audio/mga-gulay_pipino.mp3'],
                    ['name' => 'Sibuyas', 'filipino' => 'Sibuyas', 'english' => 'Onion', 'image' => '', 'audio' => 'audio/mga-gulay_sibuyas.mp3'],
                    ['name' => 'Sitaw', 'filipino' => 'Sitaw', 'english' => 'Yardlong bean', 'image' => '', 'audio' => 'audio/mga-gulay_sitaw.mp3'],
                    ['name' => 'Talong', 'filipino' => 'Talong', 'english' => 'Eggplant', 'image' => '', 'audio' => 'audio/mga-gulay_talong.mp3'],
                    ['name' => 'Upo', 'filipino' => 'Upo', 'english' => 'Bottle gourd', 'image' => '', 'audio' => 'audio/mga-gulay_upo.mp3'],
                ]
            ],
            [
                'slug' => 'mga-kulay',
                'name' => 'Mga Kulay',
                'title' => 'Mga Kulay',
                'description' => 'Makukulay na bahaghari at mga kulay sa paligid.',
                'cover_image' => '',
                'color' => '#EC4899',
                'sort_order' => 4,
                'items' => [
                    ['name' => 'Abo', 'filipino' => 'Abo', 'english' => 'Gray', 'image' => '', 'audio' => 'audio/mga-kulay_abo.mp3'],
                    ['name' => 'Asul', 'filipino' => 'Asul', 'english' => 'Blue', 'image' => '', 'audio' => 'audio/mga-kulay_asul.mp3'],
                    ['name' => 'Berde', 'filipino' => 'Berde', 'english' => 'Green', 'image' => '', 'audio' => 'audio/mga-kulay_berde.mp3'],
                    ['name' => 'Dilaw', 'filipino' => 'Dilaw', 'english' => 'Yellow', 'image' => '', 'audio' => 'audio/mga-kulay_dilaw.mp3'],
                    ['name' => 'Itim', 'filipino' => 'Itim', 'english' => 'Black', 'image' => '', 'audio' => 'audio/mga-kulay_itim.mp3'],
                    ['name' => 'Kahel', 'filipino' => 'Kahel', 'english' => 'Orange', 'image' => '', 'audio' => 'audio/mga-kulay_kahel.mp3'],
                    ['name' => 'Kayumanggi', 'filipino' => 'Kayumanggi', 'english' => 'Brown', 'image' => '', 'audio' => 'audio/mga-kulay_kayumanggi.mp3'],
                    ['name' => 'Lila', 'filipino' => 'Lila', 'english' => 'Purple', 'image' => '', 'audio' => 'audio/mga-kulay_lila.mp3'],
                    ['name' => 'Pula', 'filipino' => 'Pula', 'english' => 'Red', 'image' => '', 'audio' => 'audio/mga-kulay_pula.mp3'],
                    ['name' => 'Puti', 'filipino' => 'Puti', 'english' => 'White', 'image' => '', 'audio' => 'audio/mga-kulay_puti.mp3'],
                    ['name' => 'Rosas', 'filipino' => 'Rosas', 'english' => 'Pink', 'image' => '', 'audio' => 'audio/mga-kulay_rosas.mp3'],
                ]
            ],
            [
                'slug' => 'mga-hugis',
                'name' => 'Mga Hugis',
                'title' => 'Mga Hugis',
                'description' => 'Iba\'t ibang hugis at mga geometric figures.',
                'cover_image' => '',
                'color' => '#A855F7',
                'sort_order' => 5,
                'items' => [
                    ['name' => 'Bilog', 'filipino' => 'Bilog', 'english' => 'Circle', 'image' => '', 'audio' => 'audio/mga-hugis_bilog.mp3'],
                    ['name' => 'Bituin', 'filipino' => 'Bituin', 'english' => 'Star', 'image' => '', 'audio' => 'audio/mga-hugis_bituin.mp3'],
                    ['name' => 'Diyamante', 'filipino' => 'Diyamante', 'english' => 'Diamond', 'image' => '', 'audio' => 'audio/mga-hugis_diyamante.mp3'],
                    ['name' => 'Heptagono', 'filipino' => 'Heptagono', 'english' => 'Heptagon', 'image' => '', 'audio' => 'audio/mga-hugis_heptagono.mp3'],
                    ['name' => 'Hexagono', 'filipino' => 'Hexagono', 'english' => 'Hexagon', 'image' => '', 'audio' => 'audio/mga-hugis_hexagono.mp3'],
                    ['name' => 'Hugis-buwan', 'filipino' => 'Hugis-buwan', 'english' => 'Crescent', 'image' => '', 'audio' => 'audio/mga-hugis_hugis-buwan.mp3'],
                    ['name' => 'Hugis-itlog', 'filipino' => 'Hugis-itlog', 'english' => 'Oval', 'image' => '', 'audio' => 'audio/mga-hugis_hugis-itlog.mp3'],
                    ['name' => 'Hugis-palaso', 'filipino' => 'Hugis-palaso', 'english' => 'Arrow', 'image' => '', 'audio' => 'audio/mga-hugis_hugis-palaso.mp3'],
                    ['name' => 'Hugis-puso', 'filipino' => 'Hugis-puso', 'english' => 'Heart', 'image' => '', 'audio' => 'audio/mga-hugis_hugis-puso.mp3'],
                    ['name' => 'Kalahating-bilog', 'filipino' => 'Kalahating-bilog', 'english' => 'Semicircle', 'image' => '', 'audio' => 'audio/mga-hugis_kalahating-bilog.mp3'],
                    ['name' => 'Konus', 'filipino' => 'Konus', 'english' => 'Cone', 'image' => '', 'audio' => 'audio/mga-hugis_konus.mp3'],
                    ['name' => 'Krus', 'filipino' => 'Krus', 'english' => 'Cross', 'image' => '', 'audio' => 'audio/mga-hugis_krus.mp3'],
                    ['name' => 'Kubo', 'filipino' => 'Kubo', 'english' => 'Cube', 'image' => '', 'audio' => 'audio/mga-hugis_kubo.mp3'],
                    ['name' => 'Oktagono', 'filipino' => 'Oktagono', 'english' => 'Octagon', 'image' => '', 'audio' => 'audio/mga-hugis_oktagono.mp3'],
                    ['name' => 'Parigapay', 'filipino' => 'Parigapay', 'english' => 'Parallelogram', 'image' => '', 'audio' => 'audio/mga-hugis_parigapay.mp3'],
                    ['name' => 'Parihaba', 'filipino' => 'Parihaba', 'english' => 'Rectangle', 'image' => '', 'audio' => 'audio/mga-hugis_parihaba.mp3'],
                    ['name' => 'Parisukat', 'filipino' => 'Parisukat', 'english' => 'Square', 'image' => '', 'audio' => 'audio/mga-hugis_parisukat.mp3'],
                    ['name' => 'Pentagono', 'filipino' => 'Pentagono', 'english' => 'Pentagon', 'image' => '', 'audio' => 'audio/mga-hugis_pentagono.mp3'],
                    ['name' => 'Silindro', 'filipino' => 'Silindro', 'english' => 'Cylinder', 'image' => '', 'audio' => 'audio/mga-hugis_silindro.mp3'],
                    ['name' => 'Tatsulok', 'filipino' => 'Tatsulok', 'english' => 'Triangle', 'image' => '', 'audio' => 'audio/mga-hugis_tatsulok.mp3'],
                ]
            ],
            [
                'slug' => 'mga-numero',
                'name' => 'Mga Numero',
                'title' => 'Mga Numero',
                'description' => 'Matutong magbilang mula isa hanggang dalawampu.',
                'cover_image' => '',
                'color' => '#FACC15',
                'sort_order' => 6,
                'items' => [
                    ['name' => 'Isa', 'filipino' => 'Isa', 'english' => 'One', 'image' => '', 'audio' => 'audio/mga-numero_isa.mp3'],
                    ['name' => 'Dalawa', 'filipino' => 'Dalawa', 'english' => 'Two', 'image' => '', 'audio' => 'audio/mga-numero_dalawa.mp3'],
                    ['name' => 'Tatlo', 'filipino' => 'Tatlo', 'english' => 'Three', 'image' => '', 'audio' => 'audio/mga-numero_tatlo.mp3'],
                    ['name' => 'Apat', 'filipino' => 'Apat', 'english' => 'Four', 'image' => '', 'audio' => 'audio/mga-numero_apat.mp3'],
                    ['name' => 'Lima', 'filipino' => 'Lima', 'english' => 'Five', 'image' => '', 'audio' => 'audio/mga-numero_lima.mp3'],
                    ['name' => 'Anim', 'filipino' => 'Anim', 'english' => 'Six', 'image' => '', 'audio' => 'audio/mga-numero_anim.mp3'],
                    ['name' => 'Pito', 'filipino' => 'Pito', 'english' => 'Seven', 'image' => '', 'audio' => 'audio/mga-numero_pito.mp3'],
                    ['name' => 'Walo', 'filipino' => 'Walo', 'english' => 'Eight', 'image' => '', 'audio' => 'audio/mga-numero_walo.mp3'],
                    ['name' => 'Siyam', 'filipino' => 'Siyam', 'english' => 'Nine', 'image' => '', 'audio' => 'audio/mga-numero_siyam.mp3'],
                    ['name' => 'Sampu', 'filipino' => 'Sampu', 'english' => 'Ten', 'image' => '', 'audio' => 'audio/mga-numero_sampu.mp3'],
                    ['name' => 'Labing-isa', 'filipino' => 'Labing-isa', 'english' => 'Eleven', 'image' => '', 'audio' => 'audio/mga-numero_labing-isa.mp3'],
                    ['name' => 'Labindalawa', 'filipino' => 'Labindalawa', 'english' => 'Twelve', 'image' => '', 'audio' => 'audio/mga-numero_labindalawa.mp3'],
                    ['name' => 'Labintatlo', 'filipino' => 'Labintatlo', 'english' => 'Thirteen', 'image' => '', 'audio' => 'audio/mga-numero_labintatlo.mp3'],
                    ['name' => 'Labing-apat', 'filipino' => 'Labing-apat', 'english' => 'Fourteen', 'image' => '', 'audio' => 'audio/mga-numero_labing-apat.mp3'],
                    ['name' => 'Labinlima', 'filipino' => 'Labinlima', 'english' => 'Fifteen', 'image' => '', 'audio' => 'audio/mga-numero_labinlima.mp3'],
                    ['name' => 'Labing-anim', 'filipino' => 'Labing-anim', 'english' => 'Sixteen', 'image' => '', 'audio' => 'audio/mga-numero_labing-anim.mp3'],
                    ['name' => 'Labimpito', 'filipino' => 'Labimpito', 'english' => 'Seventeen', 'image' => '', 'audio' => 'audio/mga-numero_labimpito.mp3'],
                    ['name' => 'Labingwalo', 'filipino' => 'Labingwalo', 'english' => 'Eighteen', 'image' => '', 'audio' => 'audio/mga-numero_labingwalo.mp3'],
                    ['name' => 'Labinsiyam', 'filipino' => 'Labinsiyam', 'english' => 'Nineteen', 'image' => '', 'audio' => 'audio/mga-numero_labinsiyam.mp3'],
                    ['name' => 'Dalawampu', 'filipino' => 'Dalawampu', 'english' => 'Twenty', 'image' => '', 'audio' => 'audio/mga-numero_dalawampu.mp3'],
                ]
            ],
            [
                'slug' => 'mga-bahagi-ng-katawan',
                'name' => 'Mga Bahagi ng Katawan',
                'title' => 'Mga Bahagi ng Katawan',
                'description' => 'Alamin ang iba\'t ibang bahagi ng ating katawan.',
                'cover_image' => '',
                'color' => '#06B6D4',
                'sort_order' => 7,
                'items' => [
                    ['name' => 'Ulo', 'filipino' => 'Ulo', 'english' => 'Head', 'image' => '', 'audio' => 'audio/mga-bahagi-ng-katawan_ulo.mp3'],
                    ['name' => 'Tuhod', 'filipino' => 'Tuhod', 'english' => 'Knee', 'image' => '', 'audio' => 'audio/mga-bahagi-ng-katawan_tuhod.mp3'],
                    ['name' => 'Tiyan', 'filipino' => 'Tiyan', 'english' => 'Stomach', 'image' => '', 'audio' => 'audio/mga-bahagi-ng-katawan_tiyan.mp3'],
                    ['name' => 'Tainga', 'filipino' => 'Tainga', 'english' => 'Ear', 'image' => '', 'audio' => 'audio/mga-bahagi-ng-katawan_tainga.mp3'],
                    ['name' => 'Paa', 'filipino' => 'Paa', 'english' => 'Foot', 'image' => '', 'audio' => 'audio/mga-bahagi-ng-katawan_paa.mp3'],
                    ['name' => 'Ngipin', 'filipino' => 'Ngipin', 'english' => 'Tooth', 'image' => '', 'audio' => 'audio/mga-bahagi-ng-katawan_ngipin.mp3'],
                    ['name' => 'Mata', 'filipino' => 'Mata', 'english' => 'Eye', 'image' => '', 'audio' => 'audio/mga-bahagi-ng-katawan_mata.mp3'],
                    ['name' => 'Likod', 'filipino' => 'Likod', 'english' => 'Back', 'image' => '', 'audio' => 'audio/mga-bahagi-ng-katawan_likod.mp3'],
                    ['name' => 'Leeg', 'filipino' => 'Leeg', 'english' => 'Neck', 'image' => '', 'audio' => 'audio/mga-bahagi-ng-katawan_leeg.mp3'],
                    ['name' => 'Kamay', 'filipino' => 'Kamay', 'english' => 'Hand', 'image' => '', 'audio' => 'audio/mga-bahagi-ng-katawan_kamay.mp3'],
                    ['name' => 'Ilong', 'filipino' => 'Ilong', 'english' => 'Nose', 'image' => '', 'audio' => 'audio/mga-bahagi-ng-katawan_ilong.mp3'],
                    ['name' => 'Dila', 'filipino' => 'Dila', 'english' => 'Tongue', 'image' => '', 'audio' => 'audio/mga-bahagi-ng-katawan_dila.mp3'],
                    ['name' => 'Dibdib', 'filipino' => 'Dibdib', 'english' => 'Chest', 'image' => '', 'audio' => 'audio/mga-bahagi-ng-katawan_dibdib.mp3'],
                    ['name' => 'Daliri sa paa', 'filipino' => 'Daliri sa paa', 'english' => 'Toe', 'image' => '', 'audio' => 'audio/mga-bahagi-ng-katawan_daliri sa paa.mp3'],
                    ['name' => 'Daliri', 'filipino' => 'Daliri', 'english' => 'Finger', 'image' => '', 'audio' => 'audio/mga-bahagi-ng-katawan_daliri.mp3'],
                    ['name' => 'Buhok', 'filipino' => 'Buhok', 'english' => 'Hair', 'image' => '', 'audio' => 'audio/mga-bahagi-ng-katawan_buhok.mp3'],
                    ['name' => 'Braso', 'filipino' => 'Braso', 'english' => 'Arm', 'image' => '', 'audio' => 'audio/mga-bahagi-ng-katawan_braso.mp3'],
                    ['name' => 'Binti', 'filipino' => 'Binti', 'english' => 'Leg', 'image' => '', 'audio' => 'audio/mga-bahagi-ng-katawan_binti.mp3'],
                    ['name' => 'Bibig', 'filipino' => 'Bibig', 'english' => 'Mouth', 'image' => '', 'audio' => 'audio/mga-bahagi-ng-katawan_bibig.mp3'],
                    ['name' => 'Balikat', 'filipino' => 'Balikat', 'english' => 'Shoulder', 'image' => '', 'audio' => 'audio/mga-bahagi-ng-katawan_balikat.mp3'],
                ]
            ],
            [
                'slug' => 'mga-pagbati-at-parirala',
                'name' => 'Mga Pagbati at Parirala',
                'title' => 'Mga Pagbati at Parirala',
                'description' => 'Magagandang pagbati at magagalang na pananalita.',
                'cover_image' => '',
                'color' => '#10B981',
                'sort_order' => 8,
                'items' => [
                    ['name' => 'Walang anuman', 'filipino' => 'Walang anuman', 'english' => 'You\'re welcome', 'image' => '', 'audio' => 'audio/mga-pagbati-at-parirala_walang anuman.mp3'],
                    ['name' => 'Salamat', 'filipino' => 'Salamat', 'english' => 'Thank you', 'image' => '', 'audio' => 'audio/mga-pagbati-at-parirala_salamat.mp3'],
                    ['name' => 'Paumanhin', 'filipino' => 'Paumanhin', 'english' => 'Excuse me', 'image' => '', 'audio' => 'audio/mga-pagbati-at-parirala_paumanhin.mp3'],
                    ['name' => 'Patawad', 'filipino' => 'Patawad', 'english' => 'Sorry', 'image' => '', 'audio' => 'audio/mga-pagbati-at-parirala_patawad.mp3'],
                    ['name' => 'Paalam', 'filipino' => 'Paalam', 'english' => 'Goodbye', 'image' => '', 'audio' => 'audio/mga-pagbati-at-parirala_paalam.mp3'],
                    ['name' => 'Maligayang pagdating', 'filipino' => 'Maligayang pagdating', 'english' => 'Welcome', 'image' => '', 'audio' => 'audio/mga-pagbati-at-parirala_maligayang pagdating.mp3'],
                    ['name' => 'Maligayang pagbabalik', 'filipino' => 'Maligayang pagbabalik', 'english' => 'Welcome back', 'image' => '', 'audio' => 'audio/mga-pagbati-at-parirala_maligayang pagbabalik.mp3'],
                    ['name' => 'Mahal kita', 'filipino' => 'Mahal kita', 'english' => 'I love you', 'image' => '', 'audio' => 'audio/mga-pagbati-at-parirala_mahal kita.mp3'],
                    ['name' => 'Magandang umaga', 'filipino' => 'Magandang umaga', 'english' => 'Good morning', 'image' => '', 'audio' => 'audio/mga-pagbati-at-parirala_magandang umaga.mp3'],
                    ['name' => 'Magandang hapon', 'filipino' => 'Magandang hapon', 'english' => 'Good afternoon', 'image' => '', 'audio' => 'audio/mga-pagbati-at-parirala_magandang hapon.mp3'],
                    ['name' => 'Magandang gabi', 'filipino' => 'Magandang gabi', 'english' => 'Good evening', 'image' => '', 'audio' => 'audio/mga-pagbati-at-parirala_magandang gabi.mp3'],
                    ['name' => 'Magandang araw', 'filipino' => 'Magandang araw', 'english' => 'Good day', 'image' => '', 'audio' => 'audio/mga-pagbati-at-parirala_magandang araw.mp3'],
                    ['name' => 'Mabuti ako', 'filipino' => 'Mabuti ako', 'english' => 'I am fine', 'image' => '', 'audio' => 'audio/mga-pagbati-at-parirala_mabuti ako.mp3'],
                    ['name' => 'Kumusta ka', 'filipino' => 'Kumusta ka', 'english' => 'How are you?', 'image' => '', 'audio' => 'audio/mga-pagbati-at-parirala_kumusta ka.mp3'],
                    ['name' => 'Kumusta', 'filipino' => 'Kumusta', 'english' => 'Hello', 'image' => '', 'audio' => 'audio/mga-pagbati-at-parirala_kumusta.mp3'],
                    ['name' => 'Kita tayo', 'filipino' => 'Kita tayo', 'english' => 'See you', 'image' => '', 'audio' => 'audio/mga-pagbati-at-parirala_kita tayo.mp3'],
                    ['name' => 'Kita tayo mamaya', 'filipino' => 'Kita tayo mamaya', 'english' => 'See you later', 'image' => '', 'audio' => 'audio/mga-pagbati-at-parirala_kita tayo mamaya.mp3'],
                    ['name' => 'Ingat ka', 'filipino' => 'Ingat ka', 'english' => 'Take care', 'image' => '', 'audio' => 'audio/mga-pagbati-at-parirala_ingat ka.mp3'],
                    ['name' => 'Ikinagagalak kitang makilala', 'filipino' => 'Ikinagagalak kitang makilala', 'english' => 'Nice to meet you', 'image' => '', 'audio' => 'audio/mga-pagbati-at-parirala_ikinagagalak kitang makilala.mp3'],
                    ['name' => 'Maraming salamat', 'filipino' => 'Maraming salamat', 'english' => 'Thank you very much', 'image' => '', 'audio' => 'audio/mga-pagbati-at-parirala_maraming salamat.mp3'],
                ]
            ],
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
