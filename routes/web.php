<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('app');
});

// SPA fallback (para /cementerio/*)
Route::get('/{any}', function () {
    return view('app');
})->where('any', '.*');

