<?php

namespace Database\Seeders;

use App\Models\Collectible;
use Illuminate\Database\Seeder;

class CollectiblesSeeder extends Seeder
{
    public function run(): void
    {
        $cards = [
            // MGA HAYOP
            [
                'slug' => 'gintong-agila',
                'name' => 'Gintong Agila ng Pilipinas',
                'filipino_name' => 'Agila ng Pilipinas',
                'category' => 'Mga Hayop',
                'description' => 'Ang pambansang ibon ng Pilipinas na may malalaking pakpak at matalas na paningin.',
                'image_url' => 'https://images.unsplash.com/photo-1611689342806-0863700ce8e4?w=400&q=80',
                'audio_url' => 'audio/HAYOP/Ibon.mp3',
                'rarity' => 'legendary',
                'required_stars' => 10,
            ],
            [
                'slug' => 'tarsier-bohol',
                'name' => 'Tarsier ng Bohol',
                'filipino_name' => 'Maliit na Tarsier',
                'category' => 'Mga Hayop',
                'description' => 'Isa sa pinakamaliit na primate sa mundo na may malalaking bilog na mata.',
                'image_url' => 'https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?w=400&q=80',
                'audio_url' => 'audio/HAYOP/Unggoy.mp3',
                'rarity' => 'epic',
                'required_stars' => 8,
            ],
            [
                'slug' => 'sipag-kalabaw',
                'name' => 'Masipag na Kalabaw',
                'filipino_name' => 'Kalabaw',
                'category' => 'Mga Hayop',
                'description' => 'Matalik na kaibigan ng magsasaka sa bukid at simbolo ng kasipagan.',
                'image_url' => 'https://images.unsplash.com/photo-1589656966895-2f33e7653819?w=400&q=80',
                'audio_url' => 'audio/HAYOP/Kalabaw.mp3',
                'rarity' => 'rare',
                'required_stars' => 5,
            ],
            [
                'slug' => 'tapat-na-aso',
                'name' => 'Tapat na Aso',
                'filipino_name' => 'Aso',
                'category' => 'Mga Hayop',
                'description' => 'Mabait at matapat na bantay ng tahanan at kaibigan ng pamilya.',
                'image_url' => 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&q=80',
                'audio_url' => 'audio/HAYOP/Aso.mp3',
                'rarity' => 'common',
                'required_stars' => 3,
            ],
            [
                'slug' => 'maliksing-pusa',
                'name' => 'Maliksing Pusa',
                'filipino_name' => 'Pusa',
                'category' => 'Mga Hayop',
                'description' => 'Malambing at mahilig maglaro ng bolang sinulid sa bahay.',
                'image_url' => 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&q=80',
                'audio_url' => 'audio/HAYOP/Pusa.mp3',
                'rarity' => 'common',
                'required_stars' => 3,
            ],

            // MGA PRUTAS
            [
                'slug' => 'gintong-mangga',
                'name' => 'Gintong Manggang Hinog',
                'filipino_name' => 'Matamis na Mangga',
                'category' => 'Mga Prutas',
                'description' => 'Pambansang prutas ng Pilipinas na sikat sa mundo sa pambihirang tamis.',
                'image_url' => 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=400&q=80',
                'audio_url' => 'audio/PRUTAS/Mangga.mp3',
                'rarity' => 'epic',
                'required_stars' => 8,
            ],
            [
                'slug' => 'preskong-pakwan',
                'name' => 'Malamig na Pakwan',
                'filipino_name' => 'Pakwan',
                'category' => 'Mga Prutas',
                'description' => 'Makatas at mapulang prutas na masarap kainin kapag mainit ang araw.',
                'image_url' => 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&q=80',
                'audio_url' => 'audio/PRUTAS/Pakwan.mp3',
                'rarity' => 'rare',
                'required_stars' => 5,
            ],
            [
                'slug' => 'gintong-saging',
                'name' => 'Piling ng Saging',
                'filipino_name' => 'Saging',
                'category' => 'Mga Prutas',
                'description' => 'Mayaman sa potassium na nagbibigay ng lakas at sigla sa katawan.',
                'image_url' => 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&q=80',
                'audio_url' => 'audio/PRUTAS/Saging.mp3',
                'rarity' => 'common',
                'required_stars' => 3,
            ],
            [
                'slug' => 'puno-ng-buko',
                'name' => 'Puno ng Buhay (Buko)',
                'filipino_name' => 'Buko',
                'category' => 'Mga Prutas',
                'description' => 'Sariwang sabaw at laman na nakakapresko sa katawan.',
                'image_url' => 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&q=80',
                'audio_url' => 'audio/PRUTAS/Niyog.mp3',
                'rarity' => 'rare',
                'required_stars' => 5,
            ],

            // MGA GULAY
            [
                'slug' => 'gintong-kalabasa',
                'name' => 'Malusog na Kalabasa',
                'filipino_name' => 'Kalabasa',
                'category' => 'Mga Gulay',
                'description' => 'Pampalinaw ng mata at sagana sa bitamina A para sa matalas na paningin.',
                'image_url' => 'https://images.unsplash.com/photo-1570586437263-ab629fccc818?w=400&q=80',
                'audio_url' => 'audio/GULAY/Kalabasa.mp3',
                'rarity' => 'rare',
                'required_stars' => 5,
            ],
            [
                'slug' => 'berdeng-sitaw',
                'name' => 'Mahabang Sitaw',
                'filipino_name' => 'Sitaw',
                'category' => 'Mga Gulay',
                'description' => 'Gulay na mayaman sa protina at mineral para sa malusog na paglaki.',
                'image_url' => 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&q=80',
                'audio_url' => 'audio/GULAY/Sitaw.mp3',
                'rarity' => 'common',
                'required_stars' => 3,
            ],
            [
                'slug' => 'lilang-talong',
                'name' => 'Makintab na Talong',
                'filipino_name' => 'Talong',
                'category' => 'Mga Gulay',
                'description' => 'Masustansyang gulay na paboritong iluto sa torta at pinakbet.',
                'image_url' => 'https://images.unsplash.com/photo-1628773822503-930a84d4128f?w=400&q=80',
                'audio_url' => 'audio/GULAY/Talong.mp3',
                'rarity' => 'common',
                'required_stars' => 3,
            ],

            // MGA BAHAGI NG KATAWAN
            [
                'slug' => 'gintong-puso',
                'name' => 'Mabuting Puso',
                'filipino_name' => 'Puso',
                'category' => 'Mga Bahagi ng Katawan',
                'description' => 'Tumitibok upang maghatid ng buhay at pagmamahal sa kapwa.',
                'image_url' => 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80',
                'audio_url' => 'audio/HUGIS/hugis-puso.mp3',
                'rarity' => 'legendary',
                'required_stars' => 10,
            ],
            [
                'slug' => 'masipag-na-kamay',
                'name' => 'Matulunging Kamay',
                'filipino_name' => 'Kamay',
                'category' => 'Mga Bahagi ng Katawan',
                'description' => 'Ginagamit sa paggawa ng mabuti, pagsulat, at pagtulong sa iba.',
                'image_url' => 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=400&q=80',
                'audio_url' => 'audio/PARTE NG KATAWAN/kamay.mp3',
                'rarity' => 'rare',
                'required_stars' => 5,
            ],
        ];

        foreach ($cards as $card) {
            Collectible::updateOrCreate(
                ['slug' => $card['slug']],
                $card
            );
        }
    }
}
