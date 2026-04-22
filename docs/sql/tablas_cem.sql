/*
 Navicat Premium Data Transfer

 Source Server         : conecta
 Source Server Type    : MySQL
 Source Server Version : 80044
 Source Host           : 10.10.20.31:3317
 Source Schema         : conecta2

 Target Server Type    : MySQL
 Target Server Version : 80044
 File Encoding         : 65001

 Date: 15/04/2026 11:49:19
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for cemn_bloques
-- ----------------------------
DROP TABLE IF EXISTS `cemn_bloques`;
CREATE TABLE `cemn_bloques`  (
  `id` int(0) UNSIGNED NOT NULL AUTO_INCREMENT,
  `zona_id` int(0) UNSIGNED NOT NULL,
  `nombre` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('nichos','columbarios') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `filas` smallint(0) UNSIGNED NOT NULL,
  `columnas` smallint(0) UNSIGNED NOT NULL,
  `descripcion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `lat` decimal(10, 7) NULL DEFAULT NULL,
  `lon` decimal(10, 7) NULL DEFAULT NULL,
  `created_at` timestamp(0) NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp(0) NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `idx_codigo`(`codigo`) USING BTREE,
  INDEX `zona_id`(`zona_id`) USING BTREE,
  CONSTRAINT `cemn_bloques_ibfk_1` FOREIGN KEY (`zona_id`) REFERENCES `cemn_zonas` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cemn_cementerios
-- ----------------------------
DROP TABLE IF EXISTS `cemn_cementerios`;
CREATE TABLE `cemn_cementerios`  (
  `id` int(0) UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `municipio` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `direccion` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `lat` decimal(10, 7) NULL DEFAULT NULL,
  `lon` decimal(10, 7) NULL DEFAULT NULL,
  `notas` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` timestamp(0) NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp(0) NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of cemn_cementerios
-- ----------------------------
INSERT INTO `cemn_cementerios` VALUES (1, 'Cementerio Municipal de Somahoz', 'Los Corrales de Buelna', 'Somahoz, Los Corrales de Buelna, Cantabria', NULL, NULL, NULL, '2026-04-14 15:51:54', '2026-04-14 15:51:54');

-- ----------------------------
-- Table structure for cemn_concesion_terceros
-- ----------------------------
DROP TABLE IF EXISTS `cemn_concesion_terceros`;
CREATE TABLE `cemn_concesion_terceros`  (
  `id` int(0) UNSIGNED NOT NULL AUTO_INCREMENT,
  `concesion_id` int(0) UNSIGNED NOT NULL,
  `tercero_id` int(0) UNSIGNED NOT NULL,
  `rol` enum('concesionario','heredero','solicitante') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'concesionario',
  `fecha_desde` date NULL DEFAULT NULL,
  `fecha_hasta` date NULL DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `notas` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` timestamp(0) NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp(0) NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_activo`(`concesion_id`, `activo`) USING BTREE,
  INDEX `idx_tercero`(`tercero_id`) USING BTREE,
  CONSTRAINT `cemn_concesion_terceros_ibfk_1` FOREIGN KEY (`concesion_id`) REFERENCES `cemn_concesiones` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `cemn_concesion_terceros_ibfk_2` FOREIGN KEY (`tercero_id`) REFERENCES `cemn_terceros` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cemn_concesiones
-- ----------------------------
DROP TABLE IF EXISTS `cemn_concesiones`;
CREATE TABLE `cemn_concesiones`  (
  `id` int(0) UNSIGNED NOT NULL AUTO_INCREMENT,
  `sepultura_id` int(0) UNSIGNED NOT NULL,
  `numero_expediente` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `tipo` enum('perpetua','temporal') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'temporal',
  `fecha_concesion` date NULL DEFAULT NULL,
  `fecha_vencimiento` date NULL DEFAULT NULL,
  `duracion_anos` int(0) UNSIGNED NULL DEFAULT NULL,
  `estado` enum('vigente','caducada','renovada','transferida','anulada') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'vigente',
  `importe` decimal(10, 2) NULL DEFAULT NULL,
  `moneda` enum('pesetas','euros') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT 'euros',
  `texto_concesion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `concesion_previa_id` int(0) UNSIGNED NULL DEFAULT NULL,
  `notas` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` timestamp(0) NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp(0) NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `sepultura_id`(`sepultura_id`) USING BTREE,
  INDEX `concesion_previa_id`(`concesion_previa_id`) USING BTREE,
  INDEX `idx_expediente`(`numero_expediente`) USING BTREE,
  INDEX `idx_estado`(`estado`) USING BTREE,
  INDEX `idx_fecha`(`fecha_concesion`) USING BTREE,
  CONSTRAINT `cemn_concesiones_ibfk_1` FOREIGN KEY (`sepultura_id`) REFERENCES `cemn_sepulturas` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `cemn_concesiones_ibfk_2` FOREIGN KEY (`concesion_previa_id`) REFERENCES `cemn_concesiones` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cemn_difuntos
-- ----------------------------
DROP TABLE IF EXISTS `cemn_difuntos`;
CREATE TABLE `cemn_difuntos`  (
  `id` int(0) UNSIGNED NOT NULL AUTO_INCREMENT,
  `tercero_id` int(0) UNSIGNED NULL DEFAULT NULL,
  `nombre_completo` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_fallecimiento` date NULL DEFAULT NULL,
  `fecha_inhumacion` date NULL DEFAULT NULL,
  `sepultura_id` int(0) UNSIGNED NULL DEFAULT NULL,
  `es_titular` tinyint(1) NOT NULL DEFAULT 1,
  `parentesco` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `notas` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` timestamp(0) NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp(0) NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `tercero_id`(`tercero_id`) USING BTREE,
  INDEX `idx_sepultura`(`sepultura_id`) USING BTREE,
  INDEX `idx_titular`(`sepultura_id`, `es_titular`) USING BTREE,
  INDEX `idx_nombre`(`nombre_completo`(100)) USING BTREE,
  CONSTRAINT `cemn_difuntos_ibfk_1` FOREIGN KEY (`tercero_id`) REFERENCES `cemn_terceros` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `cemn_difuntos_ibfk_2` FOREIGN KEY (`sepultura_id`) REFERENCES `cemn_sepulturas` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cemn_documentos
-- ----------------------------
DROP TABLE IF EXISTS `cemn_documentos`;
CREATE TABLE `cemn_documentos`  (
  `id` int(0) UNSIGNED NOT NULL AUTO_INCREMENT,
  `sepultura_id` int(0) UNSIGNED NOT NULL,
  `tipo` enum('fotografia','escaneo','certificado','solicitud','concesion_doc','plano','otro') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'otro',
  `nombre_original` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `ruta_archivo` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `tamano_bytes` int(0) UNSIGNED NULL DEFAULT NULL,
  `descripcion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` timestamp(0) NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp(0) NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_sepultura`(`sepultura_id`) USING BTREE,
  CONSTRAINT `cemn_documentos_ibfk_1` FOREIGN KEY (`sepultura_id`) REFERENCES `cemn_sepulturas` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cemn_fuentes
-- ----------------------------
DROP TABLE IF EXISTS `cemn_fuentes`;
CREATE TABLE `cemn_fuentes`  (
  `id` int(0) UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('libro_registro','expediente','padron','escaneo','csv_gestiona','otro') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `periodo_desde` year NULL DEFAULT NULL,
  `periodo_hasta` year NULL DEFAULT NULL,
  `created_at` timestamp(0) NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp(0) NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 23 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of cemn_fuentes
-- ----------------------------
INSERT INTO `cemn_fuentes` VALUES (1, 'concesiones 50paginas 1.pdf', 'libro_registro', 'Concesiones historicas con solicitud, informe del parroco y acuerdo municipal', 1949, 1955, '2026-04-14 15:51:54', '2026-04-14 15:51:54');
INSERT INTO `cemn_fuentes` VALUES (2, 'concesiones 50paginas 2.pdf', 'libro_registro', 'Concesiones historicas', 1949, 1962, '2026-04-14 15:51:54', '2026-04-14 15:51:54');
INSERT INTO `cemn_fuentes` VALUES (3, 'concesiones 50paginas 3.pdf', 'libro_registro', 'Concesiones y expedientes', 1973, 1975, '2026-04-14 15:51:54', '2026-04-14 15:51:54');
INSERT INTO `cemn_fuentes` VALUES (4, 'concesiones 50paginas 4.pdf', 'libro_registro', 'Concesiones con transferencias de titularidad', 1973, 1977, '2026-04-14 15:51:54', '2026-04-14 15:51:54');
INSERT INTO `cemn_fuentes` VALUES (5, 'concesiones 50paginas 5.pdf', 'libro_registro', 'Concesiones historicas', NULL, NULL, '2026-04-14 15:51:54', '2026-04-14 15:51:54');
INSERT INTO `cemn_fuentes` VALUES (6, 'concesiones 50paginas 6.pdf', 'libro_registro', 'Concesiones historicas', NULL, NULL, '2026-04-14 15:51:54', '2026-04-14 15:51:54');
INSERT INTO `cemn_fuentes` VALUES (7, 'concesiones 50paginas 7.pdf', 'libro_registro', 'Concesiones historicas', NULL, NULL, '2026-04-14 15:51:54', '2026-04-14 15:51:54');
INSERT INTO `cemn_fuentes` VALUES (8, 'concesiones 50paginas 8.pdf', 'libro_registro', 'Concesiones historicas', NULL, NULL, '2026-04-14 15:51:54', '2026-04-14 15:51:54');
INSERT INTO `cemn_fuentes` VALUES (9, 'concesiones 68paginas.pdf', 'libro_registro', 'Concesiones historicas', NULL, NULL, '2026-04-14 15:51:54', '2026-04-14 15:51:54');
INSERT INTO `cemn_fuentes` VALUES (10, 'concesiones 30paginas.pdf', 'libro_registro', 'Concesiones historicas', NULL, NULL, '2026-04-14 15:51:54', '2026-04-14 15:51:54');
INSERT INTO `cemn_fuentes` VALUES (11, 'solicitudes 50paginas 1.pdf', 'expediente', 'Solicitudes ciudadanas', NULL, NULL, '2026-04-14 15:51:54', '2026-04-14 15:51:54');
INSERT INTO `cemn_fuentes` VALUES (12, 'solicitudes 50paginas 2.pdf', 'expediente', 'Solicitudes ciudadanas', NULL, NULL, '2026-04-14 15:51:54', '2026-04-14 15:51:54');
INSERT INTO `cemn_fuentes` VALUES (13, 'solicitudes 44paginas.pdf', 'expediente', 'Solicitudes ciudadanas', NULL, NULL, '2026-04-14 15:51:54', '2026-04-14 15:51:54');
INSERT INTO `cemn_fuentes` VALUES (14, 'informacion mixta 7paginas.pdf', 'otro', 'Documentacion administrativa mixta', NULL, NULL, '2026-04-14 15:51:54', '2026-04-14 15:51:54');
INSERT INTO `cemn_fuentes` VALUES (15, 'informacion mixta 50paginas 1.pdf', 'otro', 'Documentacion administrativa mixta', NULL, NULL, '2026-04-14 15:51:54', '2026-04-14 15:51:54');
INSERT INTO `cemn_fuentes` VALUES (16, 'informacion mixta 50paginas 2.pdf', 'otro', 'Documentacion administrativa mixta', NULL, NULL, '2026-04-14 15:51:54', '2026-04-14 15:51:54');
INSERT INTO `cemn_fuentes` VALUES (17, 'informacion mixta 10paginas.pdf', 'otro', 'Documentacion administrativa mixta', NULL, NULL, '2026-04-14 15:51:54', '2026-04-14 15:51:54');
INSERT INTO `cemn_fuentes` VALUES (18, 'Exportacion expedientes abiertos 1.csv', 'csv_gestiona', 'Export CSV: nichos, concesiones', 2016, 2025, '2026-04-14 15:51:54', '2026-04-14 15:51:54');
INSERT INTO `cemn_fuentes` VALUES (19, 'Exportacion expedientes abiertos 2.csv', 'csv_gestiona', 'Export CSV: renovaciones sepulturas', 2016, 2025, '2026-04-14 15:51:54', '2026-04-14 15:51:54');
INSERT INTO `cemn_fuentes` VALUES (20, 'Exportacion expedientes abiertos 3.csv', 'csv_gestiona', 'Export CSV: certificados exhumacion', 2016, 2025, '2026-04-14 15:51:54', '2026-04-14 15:51:54');
INSERT INTO `cemn_fuentes` VALUES (21, 'Memoria Cementerio Somahoz.pdf', 'otro', 'Memoria arquitectonica panteon y columbarios. Arq. Martinez Velasco, junio 2013', 2013, 2013, '2026-04-14 15:51:54', '2026-04-14 15:51:54');
INSERT INTO `cemn_fuentes` VALUES (22, 'ampliacion_2005_1-6.pdf', 'otro', 'Planos de la ampliacion de 2005', 2005, 2005, '2026-04-14 15:51:54', '2026-04-14 15:51:54');

-- ----------------------------
-- Table structure for cemn_movimientos
-- ----------------------------
DROP TABLE IF EXISTS `cemn_movimientos`;
CREATE TABLE `cemn_movimientos`  (
  `id` int(0) UNSIGNED NOT NULL AUTO_INCREMENT,
  `difunto_id` int(0) UNSIGNED NOT NULL,
  `tipo` enum('inhumacion','exhumacion','traslado') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha` date NULL DEFAULT NULL,
  `sepultura_origen_id` int(0) UNSIGNED NULL DEFAULT NULL,
  `sepultura_destino_id` int(0) UNSIGNED NULL DEFAULT NULL,
  `numero_expediente` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `notas` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` timestamp(0) NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp(0) NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `difunto_id`(`difunto_id`) USING BTREE,
  INDEX `sepultura_origen_id`(`sepultura_origen_id`) USING BTREE,
  INDEX `sepultura_destino_id`(`sepultura_destino_id`) USING BTREE,
  INDEX `idx_tipo`(`tipo`) USING BTREE,
  INDEX `idx_fecha`(`fecha`) USING BTREE,
  CONSTRAINT `cemn_movimientos_ibfk_1` FOREIGN KEY (`difunto_id`) REFERENCES `cemn_difuntos` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `cemn_movimientos_ibfk_2` FOREIGN KEY (`sepultura_origen_id`) REFERENCES `cemn_sepulturas` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `cemn_movimientos_ibfk_3` FOREIGN KEY (`sepultura_destino_id`) REFERENCES `cemn_sepulturas` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cemn_registro_fuentes
-- ----------------------------
DROP TABLE IF EXISTS `cemn_registro_fuentes`;
CREATE TABLE `cemn_registro_fuentes`  (
  `id` int(0) UNSIGNED NOT NULL AUTO_INCREMENT,
  `fuente_id` int(0) UNSIGNED NOT NULL,
  `entidad_tipo` enum('sepultura','concesion','tercero','difunto') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `entidad_id` int(0) UNSIGNED NOT NULL,
  `pagina` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `confianza` enum('alta','media','baja') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT 'media',
  `notas` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` timestamp(0) NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `fuente_id`(`fuente_id`) USING BTREE,
  INDEX `idx_entidad`(`entidad_tipo`, `entidad_id`) USING BTREE,
  CONSTRAINT `cemn_registro_fuentes_ibfk_1` FOREIGN KEY (`fuente_id`) REFERENCES `cemn_fuentes` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cemn_sepulturas
-- ----------------------------
DROP TABLE IF EXISTS `cemn_sepulturas`;
CREATE TABLE `cemn_sepulturas`  (
  `id` int(0) UNSIGNED NOT NULL AUTO_INCREMENT,
  `zona_id` int(0) UNSIGNED NOT NULL,
  `bloque_id` int(0) UNSIGNED NULL DEFAULT NULL,
  `tipo` enum('sepultura','nicho','columbario','panteon') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `numero` int(0) UNSIGNED NULL DEFAULT NULL,
  `fila` smallint(0) UNSIGNED NULL DEFAULT NULL,
  `columna` smallint(0) UNSIGNED NULL DEFAULT NULL,
  `parte` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `codigo` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `estado` enum('libre','ocupada','reservada','clausurada') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'libre',
  `largo_m` decimal(4, 2) NULL DEFAULT NULL,
  `ancho_m` decimal(4, 2) NULL DEFAULT NULL,
  `ubicacion_texto` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `lat` decimal(10, 7) NULL DEFAULT NULL,
  `lon` decimal(10, 7) NULL DEFAULT NULL,
  `imagen` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `notas` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` timestamp(0) NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp(0) NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `idx_codigo`(`codigo`) USING BTREE,
  INDEX `zona_id`(`zona_id`) USING BTREE,
  INDEX `idx_tipo`(`tipo`) USING BTREE,
  INDEX `idx_numero`(`numero`) USING BTREE,
  INDEX `idx_estado`(`estado`) USING BTREE,
  INDEX `idx_bloque`(`bloque_id`) USING BTREE,
  CONSTRAINT `cemn_sepulturas_ibfk_1` FOREIGN KEY (`zona_id`) REFERENCES `cemn_zonas` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `cemn_sepulturas_ibfk_2` FOREIGN KEY (`bloque_id`) REFERENCES `cemn_bloques` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cemn_terceros
-- ----------------------------
DROP TABLE IF EXISTS `cemn_terceros`;
CREATE TABLE `cemn_terceros`  (
  `id` int(0) UNSIGNED NOT NULL AUTO_INCREMENT,
  `dni` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `nombre` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellido1` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `apellido2` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `nombre_original` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `telefono` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `email` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `direccion` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `municipio` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `provincia` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `cp` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `es_empresa` tinyint(1) NOT NULL DEFAULT 0,
  `cif` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `razon_social` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `notas` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` timestamp(0) NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp(0) NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_dni`(`dni`) USING BTREE,
  INDEX `idx_nombre`(`apellido1`, `apellido2`, `nombre`) USING BTREE,
  INDEX `idx_cif`(`cif`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cemn_zonas
-- ----------------------------
DROP TABLE IF EXISTS `cemn_zonas`;
CREATE TABLE `cemn_zonas`  (
  `id` int(0) UNSIGNED NOT NULL AUTO_INCREMENT,
  `cementerio_id` int(0) UNSIGNED NOT NULL,
  `nombre` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `descripcion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` timestamp(0) NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp(0) NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `cementerio_id`(`cementerio_id`) USING BTREE,
  CONSTRAINT `cemn_zonas_ibfk_1` FOREIGN KEY (`cementerio_id`) REFERENCES `cemn_cementerios` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of cemn_zonas
-- ----------------------------
INSERT INTO `cemn_zonas` VALUES (1, 1, 'Parte vieja', 'ZV', 'Zona original del cementerio. Sepulturas en tierra orientadas Norte-Sur y Oeste-Este, delimitadas por las paredes del Campo Santo. Concesiones desde al menos 1942.', '2026-04-14 15:51:54', '2026-04-14 15:51:54');
INSERT INTO `cemn_zonas` VALUES (2, 1, 'Zona nueva', 'ZN', 'Ampliaciones posteriores. Bloques de nichos, columbarios y panteones. Incluye las ampliaciones de 2005, 2017, 2020 y 2025.', '2026-04-14 15:51:54', '2026-04-14 15:51:54');

SET FOREIGN_KEY_CHECKS = 1;
