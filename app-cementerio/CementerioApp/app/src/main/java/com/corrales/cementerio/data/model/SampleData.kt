package com.corrales.cementerio.data.model

import java.time.LocalDate

object SampleData {

    val bloques = listOf(
        BloqueNichos("B1", "Bloque San José",  filas = 10, columnas = 10, ocupados = 78, libres = 12, caducados = 8,  pendientes = 2),
        BloqueNichos("B2", "Bloque Antiguo",   filas = 8,  columnas = 8,  ocupados = 60, libres = 3,  caducados = 1,  pendientes = 0),
        BloqueNichos("B3", "Bloque Norte",     filas = 6,  columnas = 6,  ocupados = 20, libres = 16, caducados = 0,  pendientes = 0),
        BloqueNichos("B4", "Bloque Sur",       filas = 12, columnas = 8,  ocupados = 55, libres = 40, caducados = 1,  pendientes = 0),
    )

    private val t1 = Titular("T1", "Felipe",  "Alonso Arenal", "12345678A", "+34 600 123 456", "falonso@email.com")
    private val t2 = Titular("T2", "Carmen",  "García Ruiz",   "87654321B", "+34 677 234 567", "cgarcia@email.com")
    private val t3 = Titular("T3", "Juan",    "Martínez Díaz", "11223344C", "+34 655 345 678", "jmartinez@email.com")

    val unidades = listOf(
        UnidadEnterramiento(
            id = "U001", codigo = "SOM-B4-N140", bloque = "Bloque San José", fila = 2, columna = 5,
            estado = EstadoNicho.OCUPADO,
            latitud = 43.25108, longitud = -4.05792,
            difuntos = listOf(Difunto("D1", "María", "García Hernández",
                LocalDate.of(1940, 3, 15), LocalDate.of(1963, 5, 12), LocalDate.of(1963, 5, 14))),
            concesion = Concesion("C1", LocalDate.of(1964, 6, 9), LocalDate.of(2034, 6, 9), t1, 48.0, EstadoPago.AL_DIA)
        ),
        UnidadEnterramiento(
            id = "U002", codigo = "SOM-B4-N141", bloque = "Bloque San José", fila = 2, columna = 6,
            estado = EstadoNicho.CADUCADO,
            latitud = 43.25112, longitud = -4.05785,
            difuntos = listOf(Difunto("D2", "Antonio", "Ruiz López",
                LocalDate.of(1935, 7, 20), LocalDate.of(1978, 11, 3), LocalDate.of(1978, 11, 5))),
            concesion = Concesion("C2", LocalDate.of(1978, 11, 5), LocalDate.of(2023, 11, 5), t2, 48.0, EstadoPago.IMPAGO)
        ),
        UnidadEnterramiento(
            id = "U003", codigo = "SOM-B1-N025", bloque = "Bloque Antiguo", fila = 3, columna = 1,
            estado = EstadoNicho.LIBRE,
            latitud = 43.25095, longitud = -4.05810
        ),
        UnidadEnterramiento(
            id = "U004", codigo = "SOM-B4-N142", bloque = "Bloque San José", fila = 2, columna = 7,
            estado = EstadoNicho.RESERVADO,
            latitud = 43.25120, longitud = -4.05778,
            concesion = Concesion("C3", LocalDate.of(2024, 1, 10), LocalDate.of(2074, 1, 10), t3, 60.0, EstadoPago.AL_DIA)
        ),
        UnidadEnterramiento(
            id = "U005", codigo = "SOM-H032", bloque = "Parte Antigua", fila = 0, columna = 0,
            estado = EstadoNicho.PENDIENTE, esHuerfano = true,
            difuntos = listOf(Difunto("D3", "Rosa", "Pérez Gómez",
                null, LocalDate.of(1949, 2, 14), LocalDate.of(1949, 2, 16))),
            notas = "Registro procedente de libro antiguo – sin ubicación en planos"
        ),
    )

    val alertas = listOf(
        AlertaSistema("A1", TipoAlerta.VENCIMIENTO_PROXIMO, "Concesión próxima a vencer",
            "Nicho SOM-B4-N155 vence en 30 días", LocalDate.now().plusDays(30), "U001"),
        AlertaSistema("A2", TipoAlerta.IMPAGO, "Impago detectado",
            "Nicho SOM-B4-N141 – 1 año sin abonar", LocalDate.now(), "U002"),
        AlertaSistema("A3", TipoAlerta.HUERFANO, "12 registros sin ubicar",
            "Libros 1940-1960 pendientes de verificación de campo", LocalDate.now()),
        AlertaSistema("A4", TipoAlerta.CAMPO_PENDIENTE, "Verificación pendiente",
            "Bloque Norte – 8 nichos sin fotografía", LocalDate.now()),
        AlertaSistema("A5", TipoAlerta.VENCIMIENTO_PROXIMO, "Vencimiento en 90 días",
            "Nicho SOM-B1-N033 – Contactar herederos", LocalDate.now().plusDays(90)),
    )

    val estadisticas = EstadisticasCementerio(
        totalNichos = 596, ocupados = 213, libres = 71, caducados = 10,
        huerfanos = 12, alertasActivas = 5, ingresosMes = 2340.0, vencimientosProximos = 8
    )
}
