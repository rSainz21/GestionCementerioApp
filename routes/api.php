<?php

use App\Http\Controllers\Cementerio\BloqueSepulturasController;
use App\Http\Controllers\Cementerio\CementerioCatalogoController;
use App\Http\Controllers\Cementerio\NuevoCasoController;
use App\Http\Controllers\Auth\AuthController;
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
use App\Http\Controllers\Cementerio\Admin\TercerosAdminController;
use App\Http\Controllers\Cementerio\Admin\DifuntosAdminController;
use App\Http\Controllers\Cementerio\Admin\TerceroConcesionesController;
use App\Http\Controllers\Cementerio\BloquesController;
use App\Http\Controllers\Cementerio\SepulturasSearchController;
use App\Http\Controllers\Cementerio\SepulturaUpdateController;
use App\Http\Controllers\Cementerio\SepulturaDifuntosController;
use App\Http\Controllers\Cementerio\WorkflowInhumacionController;
use App\Http\Controllers\Cementerio\WorkflowExhumacionController;
use App\Http\Controllers\Cementerio\SepulturasGeoController;
use App\Http\Controllers\Cementerio\SepulturaFotoController;
use App\Http\Controllers\Cementerio\TerceroUpdateController;
use App\Http\Controllers\Cementerio\SepulturaImagenController;
use App\Http\Controllers\Cementerio\DifuntoUpdateController;
use App\Http\Controllers\Cementerio\ConcesionUpdateController;
use App\Http\Controllers\Cementerio\DifuntosSinAsignarController;
use App\Http\Controllers\Cementerio\DifuntoAsignarController;
use App\Http\Controllers\Cementerio\CementerioStatsBloqueController;

Route::post('/login', [AuthController::class, 'login']);
Route::prefix('auth')->group(function () {
    // Aliases para clientes que esperan /api/auth/*
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });
});

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
        Route::get('/stats/bloques', [CementerioStatsBloqueController::class, 'index'])
            ->middleware('permission:cementerio.ver');
        Route::get('/terceros', [TercerosSearchController::class, 'index'])
            ->middleware('permission:cementerio.ver');
        Route::put('/terceros/{id}', [TerceroUpdateController::class, 'update'])
            ->middleware('permission:cementerio.editar');
        Route::get('/concesiones', [ConcesionesSearchController::class, 'index'])
            ->middleware('permission:cementerio.ver');
        Route::get('/difuntos', [DifuntosSearchController::class, 'index'])
            ->middleware('permission:cementerio.ver');
        Route::get('/difuntos/sin-asignar', [DifuntosSinAsignarController::class, 'index'])
            ->middleware('permission:cementerio.ver');
        Route::put('/difuntos/{id}/asignar-sepultura', [DifuntoAsignarController::class, 'update'])
            ->middleware('permission:cementerio.editar');
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
        Route::post('/sepulturas/{id}/imagen', [SepulturaImagenController::class, 'store'])
            ->middleware('permission:cementerio.editar');
        Route::post('/nuevo-caso', [NuevoCasoController::class, 'store'])
            ->middleware('permission:cementerio.crear');
        Route::post('/difuntos/{id}/foto', [DifuntoFotoController::class, 'store'])
            ->middleware('permission:cementerio.editar');
        Route::put('/difuntos/{id}', [DifuntoUpdateController::class, 'update'])
            ->middleware('permission:cementerio.editar');
        Route::put('/concesiones/{id}', [ConcesionUpdateController::class, 'update'])
            ->middleware('permission:cementerio.editar');
        Route::post('/sepulturas/{id}/foto', [SepulturaFotoController::class, 'store'])
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

            Route::get('/terceros', [TercerosAdminController::class, 'index'])
                ->middleware('permission:cementerio.ver');
            Route::put('/terceros/{id}', [TerceroUpdateController::class, 'update'])
                ->middleware('permission:cementerio.editar');
            Route::get('/terceros/{id}/concesiones', [TerceroConcesionesController::class, 'index'])
                ->middleware('permission:cementerio.ver');

            Route::get('/difuntos', [DifuntosAdminController::class, 'index'])
                ->middleware('permission:cementerio.ver');
        });
    });
});

