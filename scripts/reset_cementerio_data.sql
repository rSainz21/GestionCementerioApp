-- Reset de datos del módulo Cementerio (MySQL)
-- - Elimina datos de prueba (cemn_*) respetando FKs
-- - Inserta Zonas y Bloques definidos por el usuario

SET FOREIGN_KEY_CHECKS = 0;

-- Vaciar tablas dependientes primero
TRUNCATE TABLE cemn_registro_fuentes;
TRUNCATE TABLE cemn_movimientos;
TRUNCATE TABLE cemn_documentos;
TRUNCATE TABLE cemn_difuntos;
TRUNCATE TABLE cemn_concesion_terceros;
TRUNCATE TABLE cemn_concesiones;
TRUNCATE TABLE cemn_sepulturas;
TRUNCATE TABLE cemn_bloques;
TRUNCATE TABLE cemn_zonas;

-- Tablas "catálogo" (si existen y quieres reset total del módulo)
TRUNCATE TABLE cemn_fuentes;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================================
-- 1. ZONAS
-- =========================================================================
-- NOTA: El cementerio_id = 1 corresponde a 'Cementerio Municipal de Somahoz'
INSERT IGNORE INTO cemn_zonas (id, cementerio_id, nombre, codigo, descripcion)
VALUES
(1, 1, 'Parte vieja', 'ZV', 'Zona original del cementerio. Sepulturas en tierra orientadas Norte-Sur y Oeste-Este...'),
(2, 1, 'Zona nueva', 'ZN', 'Ampliaciones posteriores. Bloques de nichos, columbarios y panteones...');

-- =========================================================================
-- 2. BLOQUES
-- =========================================================================
INSERT INTO cemn_bloques (id, zona_id, nombre, codigo, tipo, filas, columnas, descripcion)
VALUES
-- Bloques del Muro Sur (Zona Vieja)
(1, 1, 'Bloque 6 - Muro Sur', 'B6', 'nichos', 4, 10, 'Extremo derecho del Muro Sur'),
(2, 1, 'Bloque 7 - Muro Sur', 'B7', 'nichos', 4, 14, 'Tramo central-derecho del Muro Sur'),
(3, 1, 'Bloque 8 - Muro Sur', 'B8', 'nichos', 4, 32, 'Tramo extenso hasta el límite izquierdo'),

-- Bloques de la Zona Nueva (Ampliaciones)
(4, 2, 'Ampliación A', 'BA', 'nichos', 4, 10, 'Transición a ampliaciones modernas'),
(5, 2, 'Ampliación 2001 - Muro Norte', 'B2001', 'nichos', 4, 13, 'Construcción de 52 nichos'),
(6, 2, 'Ampliación 2007 - Exento', 'B2007', 'nichos', 4, 10, 'Bloque exento pintado de blanco'),
(7, 2, 'Ampliación D', 'BD', 'nichos', 4, 13, 'Ampliación D'),
(8, 2, 'Ampliación 2017', 'B2017', 'nichos', 4, 10, 'Contrato menor de 40 nichos'),
(9, 2, 'Ampliación 2020', 'B2020', 'nichos', 4, 6, 'Construcción de 24 nichos'),
(10, 2, 'Ampliación 2025', 'B2025', 'nichos', 4, 12, 'Última expansión de 48 nichos'),

-- Nuevas estructuras arquitectónicas identificadas en la memoria
(11, 2, 'Placado de Columbarios', 'COL', 'columbarios', 5, 5, 'Placado sin repisa para cenizas');

