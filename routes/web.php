<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('app');
});

// Ruta login nombrada (requerida por middleware Authenticate de Laravel)
Route::get('/login', function () {
    return view('app');
})->name('login');

// SPA fallback (para /cementerio/*)
Route::get('/{any}', function () {
    return view('app');
})->where('any', '.*');

