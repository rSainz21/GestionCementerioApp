<?php

use App\Models\CemnSetting;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        $rows = [
            ['grupo' => 'api', 'clave' => 'busqueda_global_min_caracteres', 'tipo' => 'numero', 'valor' => '2',
             'etiqueta' => 'Mín. caracteres — buscador global', 'descripcion' => 'Caracteres mínimos para lanzar la búsqueda global (1–6).'],
            ['grupo' => 'api', 'clave' => 'busqueda_global_limite_grupos', 'tipo' => 'numero', 'valor' => '8',
             'etiqueta' => 'Resultados por grupo (difuntos, concesiones, sepulturas)', 'descripcion' => 'Máximo de filas por categoría en el buscador global (3–30).'],
            ['grupo' => 'api', 'clave' => 'busqueda_global_limite_terceros', 'tipo' => 'numero', 'valor' => '6',
             'etiqueta' => 'Resultados — titulares / terceros (global)', 'descripcion' => 'Máximo de titulares en el buscador global (2–25).'],
            ['grupo' => 'api', 'clave' => 'busqueda_inline_limite', 'tipo' => 'numero', 'valor' => '15',
             'etiqueta' => 'Resultados — búsquedas en formularios', 'descripcion' => 'Máximo de sugerencias en buscadores de concesiones y personas (5–50).'],
            ['grupo' => 'api', 'clave' => 'alertas_items_por_grupo', 'tipo' => 'numero', 'valor' => '6',
             'etiqueta' => 'Alertas en sidebar — filas por grupo', 'descripcion' => 'Cuántas filas se muestran por cada tipo de alerta (3–25).'],
            ['grupo' => 'api', 'clave' => 'autocomplete_sepulturas_limite', 'tipo' => 'numero', 'valor' => '25',
             'etiqueta' => 'Autocompletado de sepulturas', 'descripcion' => 'Máximo de nichos en sugerencias al asignar o buscar (5–100).'],
            ['grupo' => 'api', 'clave' => 'foto_max_kb', 'tipo' => 'numero', 'valor' => '5120',
             'etiqueta' => 'Tamaño máx. fotos (KB)', 'descripcion' => 'Límite de subida de imágenes (personas, nichos, wizard). Valor Laravel max: en kilobytes (1024–20480).'],
            ['grupo' => 'api', 'clave' => 'documento_adjunto_max_kb', 'tipo' => 'numero', 'valor' => '10240',
             'etiqueta' => 'Tamaño máx. documentos en expediente (KB)', 'descripcion' => 'Adjuntos a sepulturas (PDF/imagen). 512–51200 KB.'],
            ['grupo' => 'api', 'clave' => 'documento_sanidad_max_kb', 'tipo' => 'numero', 'valor' => '10240',
             'etiqueta' => 'Tamaño máx. documento sanidad / exhumación (KB)', 'descripcion' => 'PDF o imagen en flujo de exhumación. 512–51200 KB.'],
            ['grupo' => 'api', 'clave' => 'regularizacion_filas_por_carga', 'tipo' => 'numero', 'valor' => '50',
             'etiqueta' => 'Regularización masiva — filas por petición', 'descripcion' => 'Paginación al listar difuntos/concesiones sin nicho (10–300).'],
            ['grupo' => 'api', 'clave' => 'regularizacion_limite_maximo', 'tipo' => 'numero', 'valor' => '500',
             'etiqueta' => 'Regularización — tope por petición', 'descripcion' => 'Máximo permitido en parámetro limit (50–2000).'],
            ['grupo' => 'api', 'clave' => 'backup_filas_por_lote', 'tipo' => 'numero', 'valor' => '500',
             'etiqueta' => 'Backup SQL — filas por INSERT', 'descripcion' => 'Tamaño de cada lote al volcar datos (100–5000).'],
            ['grupo' => 'api', 'clave' => 'geo_sepulturas_limite_default', 'tipo' => 'numero', 'valor' => '2000',
             'etiqueta' => 'Mapa — sepulturas por defecto', 'descripcion' => 'Cuántas sepulturas se cargan en geo si no se indica limit (500–10000).'],
            ['grupo' => 'api', 'clave' => 'geo_sepulturas_limite_maximo', 'tipo' => 'numero', 'valor' => '5000',
             'etiqueta' => 'Mapa — tope sepulturas en geo', 'descripcion' => 'Máximo admisible en parámetro limit del endpoint geo (1000–20000).'],
            ['grupo' => 'api', 'clave' => 'admin_listado_busqueda_limite', 'tipo' => 'numero', 'valor' => '500',
             'etiqueta' => 'Gestión — límite en búsquedas admin', 'descripcion' => 'Máximo de filas al listar personas/concesiones/sepulturas en cargas amplias (100–2000).'],
        ];

        foreach ($rows as $s) {
            CemnSetting::updateOrCreate(
                ['clave' => $s['clave']],
                $s
            );
        }
    }

    public function down(): void
    {
        $claves = [
            'busqueda_global_min_caracteres',
            'busqueda_global_limite_grupos',
            'busqueda_global_limite_terceros',
            'busqueda_inline_limite',
            'alertas_items_por_grupo',
            'autocomplete_sepulturas_limite',
            'foto_max_kb',
            'documento_adjunto_max_kb',
            'documento_sanidad_max_kb',
            'regularizacion_filas_por_carga',
            'regularizacion_limite_maximo',
            'backup_filas_por_lote',
            'geo_sepulturas_limite_default',
            'geo_sepulturas_limite_maximo',
            'admin_listado_busqueda_limite',
        ];
        CemnSetting::whereIn('clave', $claves)->delete();
    }
};
