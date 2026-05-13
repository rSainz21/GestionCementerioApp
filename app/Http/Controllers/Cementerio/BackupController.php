<?php

namespace App\Http\Controllers\Cementerio;

use App\Http\Controllers\Controller;
use App\Models\CemnSetting;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class BackupController extends Controller
{
    private const TABLAS = [
        'cemn_cementerios',
        'cemn_zonas',
        'cemn_bloques',
        'cemn_sepulturas',
        'cemn_personas',
        'cemn_concesiones',
        'cemn_concesion_personas',
        'cemn_movimientos',
        'cemn_documentos',
        'cemn_fuentes',
        'cemn_registro_fuentes',
        'cemn_settings',
    ];

    public function download(): StreamedResponse
    {
        $filename = 'cementerio_backup_'.date('Y-m-d_His').'.sql';

        return response()->stream(function () {
            $this->stream();
        }, 200, [
            'Content-Type'        => 'application/sql',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Cache-Control'       => 'no-cache, no-store',
        ]);
    }

    private function stream(): void
    {
        $db      = config('database.connections.mysql.database');
        $charset = 'utf8mb4';

        echo "-- ============================================================\n";
        echo "-- Backup Cementerio Municipal de Somahoz\n";
        echo "-- Generado: ".date('Y-m-d H:i:s')."\n";
        echo "-- Base de datos: {$db}\n";
        echo "-- ============================================================\n\n";
        echo "SET FOREIGN_KEY_CHECKS=0;\n";
        echo "SET NAMES '{$charset}';\n\n";

        foreach (self::TABLAS as $tabla) {
            $this->dumpTable($tabla);
        }

        echo "SET FOREIGN_KEY_CHECKS=1;\n";
        echo "-- Fin del backup\n";
    }

    private function dumpTable(string $tabla): void
    {
        // Verificar que la tabla existe
        try {
            $exists = DB::selectOne("SHOW TABLES LIKE '{$tabla}'");
        } catch (\Throwable) {
            return;
        }
        if (!$exists) return;

        // Estructura
        $create = DB::selectOne("SHOW CREATE TABLE `{$tabla}`");
        $createSql = $create->{'Create Table'} ?? null;

        echo "-- ----------------------------------------------------------\n";
        echo "-- Tabla: {$tabla}\n";
        echo "-- ----------------------------------------------------------\n";

        if ($createSql) {
            echo "DROP TABLE IF EXISTS `{$tabla}`;\n";
            echo $createSql.";\n\n";
        }

        // Datos en lotes de 500
        $total = DB::table($tabla)->count();
        if ($total === 0) {
            echo "-- (sin registros)\n\n";
            return;
        }

        $offset = 0;
        $batch  = CemnSetting::intRange('backup_filas_por_lote', 500, 100, 5000);

        while ($offset < $total) {
            $rows = DB::table($tabla)->offset($offset)->limit($batch)->get();
            if ($rows->isEmpty()) break;

            $cols = array_map(fn($c) => "`{$c}`", array_keys((array) $rows[0]));
            $colList = implode(', ', $cols);

            echo "INSERT INTO `{$tabla}` ({$colList}) VALUES\n";

            $values = [];
            foreach ($rows as $row) {
                $rowArr = (array) $row;
                $escaped = array_map(fn($v) => $v === null ? 'NULL' : "'".addslashes((string)$v)."'", $rowArr);
                $values[] = '('.implode(', ', $escaped).')';
            }
            echo implode(",\n", $values).";\n\n";

            $offset += $batch;
        }
    }
}
