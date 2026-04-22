<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('app');
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

/**
 * Si por cualquier motivo las rutas API no cargan (cache/syntax), evitamos que el
 * fallback web intente renderizar la SPA (y casque por Vite) cuando se pide /api/*.
 *
 * Nota: cuando `routes/api.php` está bien, esta ruta NO se usa (las rutas API
 * se registran con prioridad al prefijo /api).
 */
Route::any('/api/{any}', fn () => response('API no disponible (rutas API no cargadas).', 500))
    ->where('any', '.*');

// SPA fallback (excluye /movil y /api)
Route::get('/{any}', fn () => view('app'))->where('any', '^(?!(movil|api)).*$');

