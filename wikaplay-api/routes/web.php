<?php

use App\Http\Controllers\Api\MediaController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Intercept storage requests and serve from persistent database or disk
Route::get('/storage/{path}', [MediaController::class, 'serve'])->where('path', '.*');

