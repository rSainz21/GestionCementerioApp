<?php

use App\Http\Controllers\ApiProxyController;
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
 * Proxy opcional: tu PC sirve la PWA, pero los datos vienen del servidor del compañero.
 *
 * Lo definimos también en `web.php` para que funcione incluso si `/api/*` acaba
 * pasando por el stack web (nginx/rewrites/cachés), evitando el 500 por Vite.
 */
if (filter_var(env('USE_REMOTE_API_PROXY', false), FILTER_VALIDATE_BOOL)) {
    Route::any('/api/{path}', ApiProxyController::class)->where('path', '.*');
} else {
    // Fallback claro si /api llega a web y el proxy no está activo.
    Route::any('/api/{any}', fn () => response('API no disponible (proxy desactivado).', 500))
        ->where('any', '.*');
}

// SPA fallback (excluye /movil y /api)
Route::get('/{any}', fn () => view('app'))->where('any', '^(?!(movil|api)).*$');

