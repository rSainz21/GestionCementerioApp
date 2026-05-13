<?php

namespace Database\Seeders;

use App\Models\CemnSetting;
use Illuminate\Database\Seeder;

class CemnSettingsSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            // ── Apariencia ─────────────────────────────────────────────────
            ['grupo' => 'apariencia', 'clave' => 'color_primario',  'tipo' => 'color',  'valor' => '#118652',
             'etiqueta' => 'Color principal', 'descripcion' => 'Color de botones y elementos de acción principales.'],
            ['grupo' => 'apariencia', 'clave' => 'color_sidebar',   'tipo' => 'color',  'valor' => '#0E2F2A',
             'etiqueta' => 'Color del sidebar', 'descripcion' => 'Color de fondo del menú lateral.'],
            ['grupo' => 'apariencia', 'clave' => 'color_acento',    'tipo' => 'color',  'valor' => '#C9A227',
             'etiqueta' => 'Color de acento', 'descripcion' => 'Color secundario para badges y destacados.'],
            ['grupo' => 'apariencia', 'clave' => 'densidad',        'tipo' => 'select', 'valor' => 'normal',
             'etiqueta' => 'Densidad de la interfaz', 'descripcion' => 'Ajusta el espaciado general de la aplicación.',
             'opciones' => [['valor' => 'normal', 'etiqueta' => 'Normal'], ['valor' => 'compacta', 'etiqueta' => 'Compacta']]],

            // ── Cementerio ─────────────────────────────────────────────────
            ['grupo' => 'cementerio', 'clave' => 'nombre',    'tipo' => 'texto', 'valor' => 'Cementerio Municipal',
             'etiqueta' => 'Nombre del cementerio', 'descripcion' => 'Se muestra en el sidebar y en los informes PDF.'],
            ['grupo' => 'cementerio', 'clave' => 'subtitulo', 'tipo' => 'texto', 'valor' => 'Somahoz',
             'etiqueta' => 'Subtítulo / localidad', 'descripcion' => 'Segunda línea del encabezado del sidebar.'],
            ['grupo' => 'cementerio', 'clave' => 'municipio', 'tipo' => 'texto', 'valor' => 'Los Corrales de Buelna',
             'etiqueta' => 'Municipio', 'descripcion' => 'Municipio al que pertenece el cementerio.'],
            ['grupo' => 'cementerio', 'clave' => 'direccion', 'tipo' => 'texto', 'valor' => 'Barrio de Somahoz, s/n',
             'etiqueta' => 'Dirección', 'descripcion' => 'Dirección postal del cementerio.'],
            ['grupo' => 'cementerio', 'clave' => 'telefono',  'tipo' => 'texto', 'valor' => '',
             'etiqueta' => 'Teléfono de contacto', 'descripcion' => 'Teléfono del ayuntamiento o responsable.'],
            ['grupo' => 'cementerio', 'clave' => 'email',     'tipo' => 'texto', 'valor' => '',
             'etiqueta' => 'Email de contacto', 'descripcion' => 'Email para consultas sobre el cementerio.'],
            ['grupo' => 'cementerio', 'clave' => 'lat',       'tipo' => 'numero', 'valor' => '43.2478',
             'etiqueta' => 'Latitud GPS', 'descripcion' => 'Coordenada de latitud para el mapa.'],
            ['grupo' => 'cementerio', 'clave' => 'lon',       'tipo' => 'numero', 'valor' => '-4.0621',
             'etiqueta' => 'Longitud GPS', 'descripcion' => 'Coordenada de longitud para el mapa.'],

            // ── Cementerio — operativa ─────────────────────────────────────
            ['grupo' => 'cementerio', 'clave' => 'duracion_concesion_defecto', 'tipo' => 'select', 'valor' => '50',
             'etiqueta' => 'Duración por defecto de concesión', 'descripcion' => 'Años que se preseleccionan al crear una nueva concesión. "0" = perpetua.',
             'opciones' => [
                 ['valor' => '5',  'etiqueta' => '5 años'],
                 ['valor' => '10', 'etiqueta' => '10 años'],
                 ['valor' => '15', 'etiqueta' => '15 años'],
                 ['valor' => '20', 'etiqueta' => '20 años'],
                 ['valor' => '50', 'etiqueta' => '50 años'],
                 ['valor' => '0',  'etiqueta' => 'Perpetua'],
             ]],

            // ── Alertas ────────────────────────────────────────────────────
            ['grupo' => 'alertas', 'clave' => 'dias_aviso_vencimiento', 'tipo' => 'numero', 'valor' => '90',
             'etiqueta' => 'Días de aviso de vencimiento', 'descripcion' => 'Días de antelación para alertar sobre concesiones próximas a vencer.'],
            ['grupo' => 'alertas', 'clave' => 'dias_urgencia',          'tipo' => 'numero', 'valor' => '30',
             'etiqueta' => 'Días de urgencia', 'descripcion' => 'Concesiones que venzan en menos de estos días se marcan como urgentes.'],
            ['grupo' => 'alertas', 'clave' => 'intervalo_refresco_min', 'tipo' => 'select', 'valor' => '5',
             'etiqueta' => 'Intervalo de refresco automático', 'descripcion' => 'Frecuencia con la que se actualizan las alertas del sidebar.',
             'opciones' => [
                 ['valor' => '0',  'etiqueta' => 'Desactivado'],
                 ['valor' => '5',  'etiqueta' => 'Cada 5 min'],
                 ['valor' => '10', 'etiqueta' => 'Cada 10 min'],
                 ['valor' => '30', 'etiqueta' => 'Cada 30 min'],
                 ['valor' => '60', 'etiqueta' => 'Cada hora'],
             ]],

            // ── PDF / Informes ─────────────────────────────────────────────
            ['grupo' => 'pdf', 'clave' => 'encabezado',  'tipo' => 'texto', 'valor' => 'Ayuntamiento de Los Corrales de Buelna',
             'etiqueta' => 'Encabezado del informe', 'descripcion' => 'Aparece en la cabecera de todos los PDF generados.'],
            ['grupo' => 'pdf', 'clave' => 'pie_pagina',  'tipo' => 'texto', 'valor' => 'Cementerio Municipal de Somahoz',
             'etiqueta' => 'Pie de página', 'descripcion' => 'Texto en el pie de todos los PDF generados.'],
            ['grupo' => 'pdf', 'clave' => 'incluir_logo', 'tipo' => 'booleano', 'valor' => '0',
             'etiqueta' => 'Incluir escudo/logo', 'descripcion' => 'Muestra el logo del ayuntamiento en los informes PDF (requiere imagen configurada).'],

            // ── Sistema ────────────────────────────────────────────────────
            ['grupo' => 'sistema', 'clave' => 'registros_por_pagina', 'tipo' => 'select', 'valor' => '25',
             'etiqueta' => 'Registros por página', 'descripcion' => 'Número de filas por defecto en todas las tablas.',
             'opciones' => [
                 ['valor' => '10',  'etiqueta' => '10 registros'],
                 ['valor' => '25',  'etiqueta' => '25 registros'],
                 ['valor' => '50',  'etiqueta' => '50 registros'],
                 ['valor' => '100', 'etiqueta' => '100 registros'],
             ]],
            ['grupo' => 'sistema', 'clave' => 'zona_por_defecto', 'tipo' => 'numero', 'valor' => '1',
             'etiqueta' => 'Zona por defecto en el wizard', 'descripcion' => 'ID de la zona que se preselecciona al abrir el wizard de nuevo caso.'],
            ['grupo' => 'sistema', 'clave' => 'session_timeout_min', 'tipo' => 'select', 'valor' => '0',
             'etiqueta' => 'Tiempo de sesión (minutos)', 'descripcion' => 'Minutos de inactividad antes de cerrar sesión automáticamente. 0 = sin límite.',
             'opciones' => [
                 ['valor' => '0',    'etiqueta' => 'Sin límite'],
                 ['valor' => '60',   'etiqueta' => '1 hora'],
                 ['valor' => '240',  'etiqueta' => '4 horas'],
                 ['valor' => '480',  'etiqueta' => '8 horas'],
                 ['valor' => '1440', 'etiqueta' => '24 horas'],
             ]],

            // ── Base de datos ──────────────────────────────────────────────
            ['grupo' => 'base_de_datos', 'clave' => 'backup_auto', 'tipo' => 'booleano', 'valor' => '0',
             'etiqueta' => 'Backup automático', 'descripcion' => 'Genera una copia de seguridad diaria automáticamente (requiere cron configurado).'],
            ['grupo' => 'base_de_datos', 'clave' => 'backup_retention_days', 'tipo' => 'numero', 'valor' => '30',
             'etiqueta' => 'Días de retención de backups', 'descripcion' => 'Número de días que se conservan las copias de seguridad automáticas.'],
            ['grupo' => 'base_de_datos', 'clave' => 'papelera_retention_days', 'tipo' => 'numero', 'valor' => '60',
             'etiqueta' => 'Días en papelera', 'descripcion' => 'Días que permanecen los registros eliminados antes de borrarse definitivamente.'],
            ['grupo' => 'base_de_datos', 'clave' => 'optimize_on_backup', 'tipo' => 'booleano', 'valor' => '1',
             'etiqueta' => 'Optimizar tablas antes del backup', 'descripcion' => 'Ejecuta OPTIMIZE TABLE en las tablas del cementerio antes de generar el backup.'],

            // ── API / límites backend (lectura en controladores) ────────────
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

        foreach ($settings as $s) {
            CemnSetting::updateOrCreate(
                ['clave' => $s['clave']],
                $s
            );
        }
    }
}
