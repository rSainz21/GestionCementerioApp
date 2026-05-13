<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

class SistemaInfoController extends Controller
{
    public function index(): JsonResponse
    {
        $dbVersion = DB::selectOne('SELECT VERSION() as v')?->v ?? '—';

        $diskTotal = @disk_total_space('/') ?: 0;
        $diskFree  = @disk_free_space('/')  ?: 0;

        $conteos = [
            'cementerios'  => DB::table('cemn_cementerios')->count(),
            'zonas'        => DB::table('cemn_zonas')->count(),
            'bloques'      => DB::table('cemn_bloques')->count(),
            'sepulturas'   => DB::table('cemn_sepulturas')->count(),
            'titulares'    => DB::table('cemn_personas')->where('tipo','titular')->count(),
            'concesiones'  => DB::table('cemn_concesiones')->count(),
            'difuntos'     => DB::table('cemn_personas')->where('tipo','difunto')->count(),
            'personas'     => DB::table('cemn_personas')->count(),
            'movimientos'  => DB::table('cemn_movimientos')->count(),
            'documentos'   => DB::table('cemn_documentos')->count(),
        ];

        $papelera = [
            'personas'    => DB::table('cemn_personas')->whereNotNull('deleted_at')->count(),
            'concesiones' => DB::table('cemn_concesiones')->whereNotNull('deleted_at')->count(),
        ];

        // Tamaño de tablas en MB
        $db = config('database.connections.mysql.database');
        $tableSizes = DB::select("
            SELECT TABLE_NAME as tabla,
                   ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) AS mb
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME LIKE 'cemn_%'
            ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC
        ", [$db]);

        return response()->json([
            'php_version'      => phpversion(),
            'laravel_version'  => app()->version(),
            'db_version'       => $dbVersion,
            'db_name'          => $db,
            'app_env'          => config('app.env'),
            'app_url'          => config('app.url'),
            'disk_total_gb'    => $diskTotal ? round($diskTotal / 1073741824, 1) : null,
            'disk_free_gb'     => $diskFree  ? round($diskFree  / 1073741824, 1) : null,
            'disk_used_pct'    => $diskTotal ? round((1 - $diskFree / $diskTotal) * 100) : null,
            'conteos'          => $conteos,
            'papelera'         => $papelera,
            'tabla_sizes'      => $tableSizes,
            'storage_path'     => storage_path(),
            'max_upload_bytes' => $this->parseBytes(ini_get('upload_max_filesize')),
            'max_post_bytes'   => $this->parseBytes(ini_get('post_max_size')),
            'memory_limit'     => ini_get('memory_limit'),
            'generated_at'     => now()->format('d/m/Y H:i:s'),
        ]);
    }

    public function clearCache(): JsonResponse
    {
        Artisan::call('config:clear');
        Artisan::call('cache:clear');
        Artisan::call('view:clear');
        Artisan::call('route:clear');

        return response()->json(['ok' => true, 'message' => 'Caché limpiada correctamente.']);
    }

    public function optimizeDb(): JsonResponse
    {
        $tables = DB::select("SHOW TABLES LIKE 'cemn_%'");
        foreach ($tables as $row) {
            $table = array_values((array) $row)[0];
            DB::statement("OPTIMIZE TABLE `{$table}`");
        }

        return response()->json(['ok' => true, 'message' => 'Tablas optimizadas correctamente.']);
    }

    private function parseBytes(string $val): int
    {
        $val  = trim($val);
        $last = strtolower($val[strlen($val) - 1]);
        $num  = (int) $val;
        return match ($last) {
            'g' => $num * 1073741824,
            'm' => $num * 1048576,
            'k' => $num * 1024,
            default => $num,
        };
    }
}
