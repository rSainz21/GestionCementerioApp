# 🪦 Sistema de Gestión y Digitalización de Cementerios Municipales

## 📝 Descripción del Proyecto
[cite_start]Este proyecto consiste en la **transformación digital y regularización** de la gestión de los cementerios municipales del **Ayuntamiento de Los Corrales de Buelna**. [cite_start]El sistema sustituye el modelo analógico actual (planos manuscritos y expedientes en papel) por una solución integral basada en **SIG (Sistemas de Información Geográfica)**[cite: 10, 33].

### 🎯 Objetivos Estratégicos
* [cite_start]**Seguridad Jurídica**: Acreditar la titularidad de las concesiones frente a reclamaciones[cite: 16, 17].
* [cite_start]**Regularización de Datos**: Ubicar físicamente los "Registros Huérfanos" (difuntos sin ubicación en plano)[cite: 24, 25].
* [cite_start]**Control Económico**: Gestionar renovaciones y detectar impagos para evitar la pérdida de lucro cesante[cite: 27, 28, 29].
* [cite_start]**Expediente Digital 360°**: Centralizar documentos, títulos de propiedad y fotografías de lápidas[cite: 132, 168, 171].

---

## 🏗️ Arquitectura del Backend (Spring Boot)
La API está desarrollada bajo un patrón de diseño profesional de **Interfaz + Implementación (ServiceImpl)** para garantizar el desacoplamiento:

* **Entidades (JPA)**: Mapeo de tablas con el prefijo `cemen_` (Ej: `CemenTasaEconomica`).
* **Repositorios**: Consultas optimizadas para la "Bandeja de Regularización" e identificación de deudores.
* [cite_start]**Servicios**: Lógica para el generador dinámico de estructuras y sistema de avisos automáticos[cite: 117, 123].
* **Controladores**: Endpoints REST para la comunicación con la App Android.

---

## 📂 Módulos de la API
1.  [cite_start]**Estructura y Mapa**: Generación paramétrica de bloques de nichos y geoposicionamiento[cite: 117, 118].
2.  [cite_start]**Titularidad**: Gestión de contratos, herederos y personas de contacto[cite: 119, 121].
3.  [cite_start]**Operativa de Restos**: Registro de inhumaciones, exhumaciones y traslados internos[cite: 125, 126].
4.  [cite_start]**Multimedia**: Repositorio de documentos escaneados y galería visual de lápidas[cite: 169, 171].
5.  [cite_start]**Gestión Económica**: Liquidación de tasas funerarias y emisión de padrones[cite: 172, 174].

---

## 🛠️ Configuración del Entorno

### Requisitos
* **Java 17** o superior.
* **MySQL 8.0** (Puerto 3317).
* **Acceso SSH**: Servidor `10.10.20.31` (Puerto 2223).

### Base de Datos
La conexión se realiza al servidor central. Asegúrese de configurar las credenciales en `src/main/resources/application.properties`:
```properties
spring.datasource.url=jdbc:mysql://10.10.20.31:3317/conecta?serverTimezone=UTC
spring.datasource.username=TU_USUARIO
spring.datasource.password=TU_PASSWORD
spring.jpa.hibernate.ddl-auto=validate
