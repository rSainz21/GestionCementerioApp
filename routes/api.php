<?php

use App\Http\Controllers\Cementerio\BloqueSepulturasController;
use App\Http\Controllers\Cementerio\CementerioCatalogoController;
use App\Http\Controllers\Cementerio\NuevoCasoController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\ApiProxyController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Cementerio\CementerioStatsController;
use App\Http\Controllers\Cementerio\TercerosSearchController;
use App\Http\Controllers\Cementerio\SepulturaDetalleController;
use App\Http\Controllers\Cementerio\ConcesionesSearchController;
use App\Http\Controllers\Cementerio\DifuntoFotoController;
use App\Http\Controllers\Cementerio\DifuntosSearchController;
use App\Http\Controllers\Cementerio\SepulturaDocumentoController;
use App\Http\Controllers\Cementerio\Admin\CementeriosAdminController;
use App\Http\Controllers\Cementerio\Admin\ZonasAdminController;
use App\Http\Controllers\Cementerio\Admin\BloquesAdminController;
use App\Http\Controllers\Cementerio\Admin\SepulturasAdminController;
use App\Http\Controllers\Cementerio\Admin\ConcesionesAdminController;
use App\Http\Controllers\Cementerio\BloquesController;
use App\Http\Controllers\Cementerio\SepulturasSearchController;
use App\Http\Controllers\Cementerio\SepulturaUpdateController;
use App\Http\Controllers\Cementerio\SepulturaDifuntosController;
use App\Http\Controllers\Cementerio\WorkflowInhumacionController;
use App\Http\Controllers\Cementerio\WorkflowExhumacionController;
use App\Http\Controllers\Cementerio\SepulturasGeoController;

/**
 * Proxy opcional: tu PC sirve la PWA, pero los datos vienen del servidor del compañero.
 * Actívalo con:
 * - USE_REMOTE_API_PROXY=true
 * - REMOTE_API_BASE=http://192.168.100.69:8000
 *
 * Esto evita CORS sin tocar el servidor remoto.
 */
if (filter_var(env('USE_REMOTE_API_PROXY', false), FILTER_VALIDATE_BOOL)) {
    Route::any('/{path}', ApiProxyController::class)->where('path', '.*');
    return;
}

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::prefix('cementerio')->group(function () {
        Route::get('/bloques', [BloquesController::class, 'index'])
            ->middleware('permission:cementerio.ver');
        Route::get('/sepulturas/search', [SepulturasSearchController::class, 'index'])
            ->middleware('permission:cementerio.ver');
        Route::get('/sepulturas/geo', [SepulturasGeoController::class, 'index'])
            ->middleware('permission:cementerio.ver');
        Route::get('/stats', [CementerioStatsController::class, 'index'])
            ->middleware('permission:cementerio.ver');
        Route::get('/terceros', [TercerosSearchController::class, 'index'])
            ->middleware('permission:cementerio.ver');
        Route::get('/concesiones', [ConcesionesSearchController::class, 'index'])
            ->middleware('permission:cementerio.ver');
        Route::get('/difuntos', [DifuntosSearchController::class, 'index'])
            ->middleware('permission:cementerio.ver');
        Route::get('/catalogo', [CementerioCatalogoController::class, 'catalogo'])
            ->middleware('permission:cementerio.ver');
        Route::get('/bloques/{bloque}/sepulturas', [BloqueSepulturasController::class, 'index'])
            ->middleware('permission:cementerio.ver');
        Route::get('/sepulturas/{id}', [SepulturaDetalleController::class, 'show'])
            ->middleware('permission:cementerio.ver');
        Route::get('/sepulturas/{id}/difuntos', [SepulturaDifuntosController::class, 'index'])
            ->middleware('permission:cementerio.ver');
        Route::put('/sepulturas/{id}', [SepulturaUpdateController::class, 'update'])
            ->middleware('permission:cementerio.editar');
        Route::post('/sepulturas/{id}/documentos', [SepulturaDocumentoController::class, 'store'])
            ->middleware('permission:cementerio.editar');
        Route::post('/nuevo-caso', [NuevoCasoController::class, 'store'])
            ->middleware('permission:cementerio.crear');
        Route::post('/difuntos/{id}/foto', [DifuntoFotoController::class, 'store'])
            ->middleware('permission:cementerio.editar');
        Route::post('/workflows/inhumacion', [WorkflowInhumacionController::class, 'store'])
            ->middleware('permission:cementerio.crear');
        Route::post('/workflows/exhumacion', [WorkflowExhumacionController::class, 'store'])
            ->middleware('permission:cementerio.editar');

        Route::prefix('admin')->group(function () {
            Route::get('/cementerios', [CementeriosAdminController::class, 'index'])
                ->middleware('permission:cementerio.ver');
            Route::post('/cementerios', [CementeriosAdminController::class, 'store'])
                ->middleware('permission:cementerio.editar');
            Route::put('/cementerios/{id}', [CementeriosAdminController::class, 'update'])
                ->middleware('permission:cementerio.editar');
            Route::delete('/cementerios/{id}', [CementeriosAdminController::class, 'destroy'])
                ->middleware('permission:cementerio.admin');

            Route::get('/zonas', [ZonasAdminController::class, 'index'])
                ->middleware('permission:cementerio.ver');
            Route::post('/zonas', [ZonasAdminController::class, 'store'])
                ->middleware('permission:cementerio.editar');
            Route::put('/zonas/{id}', [ZonasAdminController::class, 'update'])
                ->middleware('permission:cementerio.editar');
            Route::delete('/zonas/{id}', [ZonasAdminController::class, 'destroy'])
                ->middleware('permission:cementerio.admin');

            Route::get('/bloques', [BloquesAdminController::class, 'index'])
                ->middleware('permission:cementerio.ver');
            Route::post('/bloques', [BloquesAdminController::class, 'store'])
                ->middleware('permission:cementerio.editar');
            Route::put('/bloques/{id}', [BloquesAdminController::class, 'update'])
                ->middleware('permission:cementerio.editar');
            Route::delete('/bloques/{id}', [BloquesAdminController::class, 'destroy'])
                ->middleware('permission:cementerio.admin');

            Route::get('/sepulturas', [SepulturasAdminController::class, 'index'])
                ->middleware('permission:cementerio.ver');
            Route::post('/sepulturas', [SepulturasAdminController::class, 'store'])
                ->middleware('permission:cementerio.editar');
            Route::put('/sepulturas/{id}', [SepulturasAdminController::class, 'update'])
                ->middleware('permission:cementerio.editar');
            Route::delete('/sepulturas/{id}', [SepulturasAdminController::class, 'destroy'])
                ->middleware('permission:cementerio.admin');

            Route::get('/concesiones', [ConcesionesAdminController::class, 'index'])
                ->middleware('permission:cementerio.ver');
        });
    });
});

