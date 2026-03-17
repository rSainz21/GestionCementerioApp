# 🪦 Sistema de Gestión y Digitalización de Cementerios Municipales

## 📝 Descripción del Proyecto
Este proyecto consiste en la **transformación digital y regularización** de la gestión de los cementerios municipales del **Ayuntamiento de Los Corrales de Buelna**.El sistema sustituye el modelo analógico actual (planos manuscritos y expedientes en papel) por una solución integral basada en **SIG (Sistemas de Información Geográfica).

### 🎯 Objetivos Estratégicos
* **Seguridad Jurídica**: Acreditar la titularidad de las concesiones frente a reclamaciones.
  **Regularización de Datos**: Ubicar físicamente los "Registros Huérfanos" (difuntos sin ubicación en plano).
* [**Control Económico**: Gestionar renovaciones y detectar impagos para evitar la pérdida de lucro cesante.
* **Expediente Digital 360°**: Centralizar documentos, títulos de propiedad y fotografías de lápidas.

---

## 🏗️ Arquitectura del Backend (Spring Boot)
La API está desarrollada bajo un patrón de diseño profesional de **Interfaz + Implementación (ServiceImpl)** para garantizar el desacoplamiento:

* **Entidades (JPA)**: Mapeo de tablas con el prefijo `cemen_` (Ej: `CemenTasaEconomica`).
* **Repositorios**: Consultas optimizadas para la "Bandeja de Regularización" e identificación de deudores.
* **Servicios**: Lógica para el generador dinámico de estructuras y sistema de avisos automáticos[cite: 117, 123].
* **Controladores**: Endpoints REST para la comunicación con la App Android.

---

## 📂 Módulos de la API
1.  **Estructura y Mapa**: Generación paramétrica de bloques de nichos y geoposicionamiento[cite: 117, 118].
2.  **Titularidad**: Gestión de contratos, herederos y personas de contacto[cite: 119, 121].
3.  **Operativa de Restos**: Registro de inhumaciones, exhumaciones y traslados internos[cite: 125, 126].
4.  **Multimedia**: Repositorio de documentos escaneados y galería visual de lápidas[cite: 169, 171].
5.  **Gestión Económica**: Liquidación de tasas funerarias y emisión de padrones[cite: 172, 174].

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
