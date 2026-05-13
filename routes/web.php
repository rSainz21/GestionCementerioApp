<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('app');
});

// Diagnóstico rápido para confirmar que Laravel está sirviendo (p. ej. :8000)
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
 * PWA móvil.
 *
 * Importante: estas rutas deben ir ANTES del fallback general,
 * o `/movil` quedará capturada por el SPA principal.
 */
Route::get('/movil', fn () => view('movil'))->name('pwa.movil');
Route::get('/movil/{any}', fn () => view('movil'))
    ->where('any', '.*')
    ->name('pwa.movil.fallback');

// SPA fallback (excluye /movil y cualquier ruta de la API).
// Importante: si la app vive bajo subcarpeta (p. ej. /conecta2/public/), Request::path()
// puede ser "conecta2/api/…" y NO empezar por "api"; hay que excluir también "…/api/…"
// para que POST /…/api/cementerio/… no caiga aquí (solo GET) y devuelva 405.
Route::get('/{any}', fn () => view('app'))->where(
    'any',
    '^(?!movil(/|$))(?!api(/|$))(?!.*/api/).*$'
);

