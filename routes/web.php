<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('app');
});

// Diagn?stico r?pido para confirmar qu? Laravel est? sirviendo :8000
Route::get('/__pwa_proxy', function () {
    return response()->json([
        'app' => config('app.name'),
        'base_path' => base_path(),
        'app_url' => config('app.url'),
        'use_remote_api_proxy' => filter_var(env('USE_REMOTE_API_PROXY', false), FILTER_VALIDATE_BOOL),
        'remote_api_base' => env('REMOTE_API_BASE'),
    ]);
});

/**
 * PWA m?vil.
 *
 * Importante: estas rutas deben ir ANTES del fallback general,
 * o `/movil` quedar? capturada por el SPA principal.
 */
Route::get('/movil', fn () => view('movil'))->name('pwa.movil');
Route::get('/movil/{any}', fn () => view('movil'))
    ->where('any', '.*')
    ->name('pwa.movil.fallback');

// SPA fallback (excluye /movil y /api)
Route::get('/{any}', fn () => view('app'))->where('any', '^(?!(movil|api)).*$');

