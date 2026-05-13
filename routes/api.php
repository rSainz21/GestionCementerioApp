<?php

use App\Http\Controllers\Cementerio\BloqueSepulturasController;
use App\Http\Controllers\Cementerio\CementerioCatalogoController;
use App\Http\Controllers\Cementerio\NuevoCasoController;
use App\Http\Controllers\Auth\AuthController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Cementerio\CementerioStatsController;
use App\Http\Controllers\Cementerio\PersonasSearchController;
use App\Http\Controllers\Cementerio\PersonaSinSepulturaController;
use App\Http\Controllers\Cementerio\PersonaCreateController;
use App\Http\Controllers\Cementerio\PersonaShowController;
use App\Http\Controllers\Cementerio\PersonaUpdateController;
use App\Http\Controllers\Cementerio\PersonaFotoController;
use App\Http\Controllers\Cementerio\PersonaAsignarController;
use App\Http\Controllers\Cementerio\SepulturaDetalleController;
use App\Http\Controllers\Cementerio\ConcesionesSearchController;
use App\Http\Controllers\Cementerio\SepulturaDocumentoController;
use App\Http\Controllers\Cementerio\Admin\CementeriosAdminController;
use App\Http\Controllers\Cementerio\Admin\ZonasAdminController;
use App\Http\Controllers\Cementerio\Admin\BloquesAdminController;
use App\Http\Controllers\Cementerio\Admin\SepulturasAdminController;
use App\Http\Controllers\Cementerio\Admin\ConcesionesAdminController;
use App\Http\Controllers\Cementerio\Admin\PersonasAdminController;
use App\Http\Controllers\Cementerio\Admin\PersonaConcesionesController;
use App\Http\Controllers\Cementerio\BloquesController;
use App\Http\Controllers\Cementerio\SepulturasSearchController;
use App\Http\Controllers\Cementerio\SepulturaUpdateController;
use App\Http\Controllers\Cementerio\SepulturaDifuntosController;
use App\Http\Controllers\Cementerio\WorkflowInhumacionController;
use App\Http\Controllers\Cementerio\WorkflowExhumacionController;
use App\Http\Controllers\Cementerio\SepulturasGeoController;
use App\Http\Controllers\Cementerio\ZonasGeoController;
use App\Http\Controllers\Cementerio\BloquesGeoController;
use App\Http\Controllers\Cementerio\SepulturaFotoController;
use App\Http\Controllers\Cementerio\SepulturaImagenController;
use App\Http\Controllers\Cementerio\ConcesionUpdateController;
use App\Http\Controllers\Cementerio\ConcesionesSinAsignarController;
use App\Http\Controllers\Cementerio\ConcesionAsignarController;
use App\Http\Controllers\Cementerio\ConcesionCreateController;
use App\Http\Controllers\Cementerio\CementerioStatsBloqueController;
use App\Http\Controllers\Cementerio\CementerioStatsTipoController;
use App\Http\Controllers\Cementerio\CementerioStatsZonaController;
use App\Http\Controllers\Cementerio\IaProcesarFotoController;
use App\Http\Controllers\Cementerio\SettingsController;
use App\Http\Controllers\Cementerio\SistemaInfoController;
use App\Http\Controllers\Cementerio\BackupController;
use App\Http\Controllers\Cementerio\AlertasController;
use App\Http\Controllers\Cementerio\PapeleraController;
use App\Http\Controllers\Cementerio\BuscadorGlobalController;
use App\Http\Controllers\Cementerio\ConcesionRenovarController;
use App\Http\Controllers\Admin\UsersAdminController;

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

    Route::post('/ia-lapida-scan', [IaProcesarFotoController::class, 'procesarDesdeBody'])
        ->middleware('permission:cementerio.editar')
        ->name('ia_lapida.scan');
    Route::post('/ia-lapida-confirmar', [IaProcesarFotoController::class, 'confirmarDesdeBody'])
        ->middleware('permission:cementerio.editar')
        ->name('ia_lapida.confirmar');

    Route::post('/cementerio-ia/scan', [IaProcesarFotoController::class, 'procesarDesdeBody'])
        ->middleware('permission:cementerio.editar')
        ->name('cementerio_ia.scan');
    Route::post('/cementerio-ia/confirm-difunto', [IaProcesarFotoController::class, 'confirmarDesdeBody'])
        ->middleware('permission:cementerio.editar')
        ->name('cementerio_ia.confirm_difunto');
    Route::post('/cementerio-ia/procesar-foto/{id}', [IaProcesarFotoController::class, 'procesar'])
        ->whereNumber('id')
        ->middleware('permission:cementerio.editar')
        ->name('cementerio_ia.procesar_foto');
    Route::post('/cementerio-ia/confirmar/{id}', [IaProcesarFotoController::class, 'confirmar'])
        ->whereNumber('id')
        ->middleware('permission:cementerio.editar')
        ->name('cementerio_ia.confirmar');

    Route::prefix('cementerio')->group(function () {
        Route::get('/bloques', [BloquesController::class, 'index'])
            ->middleware('permission:cementerio.ver');
        Route::get('/sepulturas/search', [SepulturasSearchController::class, 'index'])
            ->middleware('permission:cementerio.ver');
        Route::get('/zonas/geo', [ZonasGeoController::class, 'index'])
            ->middleware('permission:cementerio.ver');
        Route::get('/bloques/geo', [BloquesGeoController::class, 'index'])
            ->middleware('permission:cementerio.ver');
        Route::get('/sepulturas/geo', [SepulturasGeoController::class, 'index'])
            ->middleware('permission:cementerio.ver');
        Route::get('/stats', [CementerioStatsController::class, 'index'])
            ->middleware('permission:cementerio.ver');
        Route::get('/stats/bloques', [CementerioStatsBloqueController::class, 'index'])
            ->middleware('permission:cementerio.ver');
        Route::get('/stats/tipos', [CementerioStatsTipoController::class, 'index'])
            ->middleware('permission:cementerio.ver');
        Route::get('/stats/zonas', [CementerioStatsZonaController::class, 'index'])
            ->middleware('permission:cementerio.ver');
        Route::get('/personas', [PersonasSearchController::class, 'index'])
            ->middleware('permission:cementerio.ver');
        Route::get('/personas/sin-sepultura', [PersonaSinSepulturaController::class, 'index'])
            ->middleware('permission:cementerio.ver');
        Route::post('/personas', [PersonaCreateController::class, 'store'])
            ->middleware('permission:cementerio.crear');
        Route::get('/personas/{id}', [PersonaShowController::class, 'show'])
            ->middleware('permission:cementerio.ver');
        Route::post('/personas/{id}/foto', [PersonaFotoController::class, 'store'])
            ->middleware('permission:cementerio.editar');
        Route::put('/personas/{id}', [PersonaUpdateController::class, 'update'])
            ->middleware('permission:cementerio.editar');
        Route::put('/personas/{id}/asignar-sepultura', [PersonaAsignarController::class, 'update'])
            ->middleware('permission:cementerio.editar');
        Route::get('/concesiones', [ConcesionesSearchController::class, 'index'])
            ->middleware('permission:cementerio.ver');
        Route::get('/concesiones/sin-asignar', [ConcesionesSinAsignarController::class, 'index'])
            ->middleware('permission:cementerio.ver');
        Route::put('/concesiones/{id}/asignar-sepultura', [ConcesionAsignarController::class, 'update'])
            ->middleware('permission:cementerio.editar');
        Route::get('/catalogo', [CementerioCatalogoController::class, 'catalogo'])
            ->middleware('permission:cementerio.ver');
        Route::get('/bloques/{bloque}/sepulturas', [BloqueSepulturasController::class, 'index'])
            ->middleware('permission:cementerio.ver');

        Route::post('/ia/procesar-foto/{id}', [IaProcesarFotoController::class, 'procesar'])
            ->whereNumber('id')
            ->middleware('permission:cementerio.editar')
            ->name('cementerio.ia.procesar_foto');
        Route::post('/ia/confirmar/{id}', [IaProcesarFotoController::class, 'confirmar'])
            ->whereNumber('id')
            ->middleware('permission:cementerio.editar')
            ->name('cementerio.ia.confirmar');
        Route::post('/sepulturas/{id}/procesar-foto-ia', [IaProcesarFotoController::class, 'procesar'])
            ->whereNumber('id')
            ->middleware('permission:cementerio.editar');
        Route::post('/sepulturas/{id}/confirmar-ia', [IaProcesarFotoController::class, 'confirmar'])
            ->whereNumber('id')
            ->middleware('permission:cementerio.editar');

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
        Route::post('/concesiones', [ConcesionCreateController::class, 'store'])
            ->middleware('permission:cementerio.crear');
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

            Route::get('/personas', [PersonasAdminController::class, 'index'])
                ->middleware('permission:cementerio.ver');
            Route::put('/personas/{id}', [PersonaUpdateController::class, 'update'])
                ->middleware('permission:cementerio.editar');
            Route::get('/personas/{id}/concesiones', [PersonaConcesionesController::class, 'index'])
                ->middleware('permission:cementerio.ver');

            Route::get('/zonas/{id}', [ZonasAdminController::class, 'show'])
                ->middleware('permission:cementerio.ver');
        });

        // ── Settings ─────────────────────────────────────────────────────────
        Route::get('/settings', [SettingsController::class, 'index'])
            ->middleware('permission:cementerio.ver');
        Route::put('/settings', [SettingsController::class, 'update'])
            ->middleware('permission:cementerio.admin');

        // ── Sistema / mantenimiento ───────────────────────────────────────────
        Route::get('/sistema', [SistemaInfoController::class, 'index'])
            ->middleware('permission:cementerio.admin');
        Route::post('/sistema/cache-clear', [SistemaInfoController::class, 'clearCache'])
            ->middleware('permission:cementerio.admin');
        Route::post('/sistema/optimize-db', [SistemaInfoController::class, 'optimizeDb'])
            ->middleware('permission:cementerio.admin');

        // ── Backup ───────────────────────────────────────────────────────────
        Route::get('/backup/download', [BackupController::class, 'download'])
            ->middleware('permission:cementerio.admin');

        // ── Alertas ──────────────────────────────────────────────────────────
        Route::get('/alertas', [AlertasController::class, 'index'])
            ->middleware('permission:cementerio.ver');

        // ── Papelera ─────────────────────────────────────────────────────────
        Route::get('/papelera', [PapeleraController::class, 'index'])
            ->middleware('permission:cementerio.admin');
        Route::post('/papelera/{tipo}/{id}/restore', [PapeleraController::class, 'restore'])
            ->middleware('permission:cementerio.admin');
        Route::delete('/papelera/{tipo}/{id}', [PapeleraController::class, 'destroy'])
            ->middleware('permission:cementerio.admin');
        Route::delete('/papelera', [PapeleraController::class, 'vaciar'])
            ->middleware('permission:cementerio.admin');

        // ── Buscador global ──────────────────────────────────────────────────
        Route::get('/buscar', [BuscadorGlobalController::class, 'search'])
            ->middleware('permission:cementerio.ver');

        // ── Renovación de concesiones ─────────────────────────────────────────
        Route::post('/concesiones/{id}/renovar', [ConcesionRenovarController::class, 'renovar'])
            ->middleware('permission:cementerio.editar');
        Route::get('/concesiones/{id}/historial', [ConcesionRenovarController::class, 'historial'])
            ->middleware('permission:cementerio.ver');
    });

    // ── Gestión de usuarios (solo admin) ──────────────────────────────────────
    Route::prefix('admin')->middleware('permission:cementerio.admin')->group(function () {
        Route::get('/users', [UsersAdminController::class, 'index']);
        Route::post('/users', [UsersAdminController::class, 'store']);
        Route::put('/users/{id}', [UsersAdminController::class, 'update']);
        Route::delete('/users/{id}', [UsersAdminController::class, 'destroy']);
        Route::put('/users/{id}/roles', [UsersAdminController::class, 'updateRoles']);
        Route::put('/users/{id}/permissions', [UsersAdminController::class, 'updatePermissions']);
    });
});

