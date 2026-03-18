# 🏛️ Sistema de Gestión Integral de Cementerios Municipales

Este proyecto representa la **Transformación Digital y Regularización de la Gestión de los cementerios municipales del Ayuntamiento de Los Corrales de Buelna**.  

El sistema sustituye un modelo analógico fragmentado y obsoleto por una solución tecnológica avanzada basada en un **Sistema de Información Geográfica (SIG)**.

---

## 📌 Visión del Proyecto

El objetivo es resolver deficiencias críticas identificadas en el modelo de gestión actual:

- ⚖️ **Inseguridad Jurídica**  
  Eliminación de la ambigüedad en la titularidad causada por anotaciones manuscritas y documentos antiguos.

- 🗺️ **Obsolescencia Cartográfica**  
  Creación de una correspondencia unívoca entre el "papel" y el "terreno" mediante mapas dinámicos.

- 🪦 **Registros "Huérfanos"**  
  Recuperación de la trazabilidad de restos que carecen de ubicación física en los planos actuales.

- 💰 **Control Económico**  
  Gestión sistemática de vencimientos de concesiones para evitar la pérdida de lucro cesante.

---

## 🛠️ Stack Tecnológico

La API ha sido desarrollada con una arquitectura moderna y segura:

- **Lenguaje:** Java 17  
- **Framework:** Spring Boot 4.0.3  
- **Seguridad:** Spring Security con JWT (JSON Web Token) y encriptación de contraseñas con BCrypt  
- **Persistencia:** Spring Data JPA / Hibernate  
- **Base de Datos:** MySQL  
- **Documentación:** Swagger UI (`/swagger-ui.html`)

---

## 🚀 Funcionalidades Principales

El backend expone servicios diseñados para cubrir el ciclo de vida completo de la gestión funeraria:

### 1. 🗺️ Gestión SIG y Estructuras Paramétricas

- **Generador Dinámico**  
  Permite crear bloques de nichos especificando filas, columnas y sentido de numeración para adaptarse a la realidad física de cada cementerio.

- **Geoposicionamiento**  
  Cada unidad (nicho, tumba, panteón) cuenta con coordenadas GPS para localización precisa.

---

### 2. 🧑‍🔧 Regularización y Trabajo de Campo

- **Bandeja de Restos Huérfanos**  
  Interfaz para gestionar registros antiguos sin ubicación física.

- **Vinculación In Situ**  
  Funcionalidad para que los operarios vinculen restos a huecos físicos mediante el método de *drag & drop* sobre el mapa tras la verificación en campo.

---

### 3. 📁 Expediente Digital 360°

- **Gestión Multimedia**  
  Almacenamiento de fotos de lápidas para auditoría visual y estado de conservación.

- **Repositorio Documental**  
  Digitalización de títulos de propiedad, solicitudes y actas de defunción.

---

### 4. ⚙️ Administración y Control

- **Gestión de Concesiones**  
  Sistema de alertas de caducidad y control de herederos.

- **Módulo Económico**  
  Control de impagos, emisión de padrones de mantenimiento y liquidación de tasas.

---

## 📋 Configuración del Entorno

### Requisitos

- Java 17 o superior  
- MySQL Server  
- Gradle (incluido mediante `gradlew`)  

### Instalación

1. Clonar el repositorio  
2. Configurar las credenciales de la base de datos en:  

src/main/resources/application.properties

3. Construir y ejecutar la aplicación:

```bash
./gradlew bootRun
