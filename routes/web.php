<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('app');
});

/**
 * PWA móvil.
 *
 * Importante: estas rutas deben ir ANTES del fallback general,
 * o `/movil` quedará capturada por el SPA principal.
 */
Route::get('/movil', fn () => view('movil'))->name('pwa.movil');
Route::get('/movil/{any}', fn () => view('movil'))
    ->where('any', '.*')
    ->name('pwa.movil.fallback');

// SPA fallback (excluye /movil y /api)
Route::get('/{any}', fn () => view('app'))->where('any', '^(?!(movil|api)).*$');

