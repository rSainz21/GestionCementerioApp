<?php

use App\Http\Controllers\ApiProxyController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('app');
});

// Diagnóstico rápido para confirmar qué Laravel está sirviendo :8000
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

/**
 * Proxy opcional: tu PC sirve la PWA, pero los datos vienen del servidor del compa?ero.
 *
 * Lo definimos tambi?n en `web.php` para que funcione incluso si `/api/*` acaba
 * pasando por el stack web (nginx/rewrites/cach?s), evitando el 500 por Vite.
 */
if (filter_var(env('USE_REMOTE_API_PROXY', false), FILTER_VALIDATE_BOOL)) {
    Route::any('/api/{path}', ApiProxyController::class)->where('path', '.*');
} else {
    // Fallback claro si /api llega a web y el proxy no est? activo.
    Route::any('/api/{any}', fn () => response('API no disponible (proxy desactivado).', 500))
        ->where('any', '.*');
}

// SPA fallback (excluye /movil y /api)
Route::get('/{any}', fn () => view('app'))->where('any', '^(?!(movil|api)).*$');

