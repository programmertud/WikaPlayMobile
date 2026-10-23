<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('wikaplay:reset-rewards', function () {
    \App\Models\StudentCollectible::truncate();
    \App\Models\StarTransaction::truncate();
    \App\Models\MinigameSession::truncate();
    \App\Models\User::query()->update(['stars_balance' => 0]);
    $this->info('Reset success: Stars set to 0 and all student collectibles cleared.');
})->purpose('Reset stars and collectibles data for all students');

Artisan::command('wikaplay:check-collectibles', function () {
    // Delete any old non-standard slugs (not starting with category prefix)
    $validPrefixes = ['hayop-', 'prutas-', 'gulay-', 'kulay-', 'hugis-', 'bilang-', 'katawan-', 'pagbati-'];
    $deleted = \App\Models\Collectible::where(function ($q) use ($validPrefixes) {
        foreach ($validPrefixes as $prefix) {
            $q->where('slug', 'not like', $prefix . '%');
        }
    })->delete();

    $total = \App\Models\Collectible::count();
    $this->info("Deleted old non-conforming collectibles: {$deleted}. Remaining total: {$total}");

    foreach (\App\Models\Collectible::select('category', \Illuminate\Support\Facades\DB::raw('count(*) as cnt'))->groupBy('category')->get() as $row) {
        $this->line(" - {$row->category}: {$row->cnt}");
    }
})->purpose('Check and cleanup collectibles count and categories');


