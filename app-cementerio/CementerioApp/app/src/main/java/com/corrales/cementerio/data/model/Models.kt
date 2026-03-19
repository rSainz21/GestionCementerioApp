package com.corrales.cementerio.data.model

import java.time.LocalDate

enum class EstadoNicho(val label: String) {
    OCUPADO("Ocupado"), LIBRE("Libre"), CADUCADO("Caducado"),
    RESERVADO("Reservado"), PENDIENTE("Pendiente revisión")
}

enum class TipoUnidad(val label: String) {
    NICHO("Nicho"), TUMBA("Tumba"), PANTEON("Panteón"),
    COLUMBARIO("Columbario"), OSARIO("Osario")
}

enum class EstadoPago(val label: String) {
    AL_DIA("Al día"), PENDIENTE("Pendiente"), IMPAGO("Impago"), EXENTO("Exento")
}

enum class TipoAlerta(val label: String) {
    VENCIMIENTO_PROXIMO("Vencimiento próximo"),
    VENCIMIENTO_HOY("Vence hoy"),
    IMPAGO("Impago detectado"),
    HUERFANO("Registro sin ubicar"),
    CAMPO_PENDIENTE("Verificación pendiente")
}

data class Difunto(
    val id: String,
    val nombre: String,
    val apellidos: String,
    val fechaNacimiento: LocalDate?,
    val fechaDefuncion: LocalDate,
    val fechaInhumacion: LocalDate,
    val procedencia: String = "",
    val notas: String = ""
)

data class Titular(
    val id: String,
    val nombre: String,
    val apellidos: String,
    val dni: String = "",
    val telefono: String = "",
    val email: String = ""
)

data class Concesion(
    val id: String,
    val fechaInicio: LocalDate,
    val fechaVencimiento: LocalDate,
    val titular: Titular,
    val tasaAnual: Double = 0.0,
    val estadoPago: EstadoPago = EstadoPago.AL_DIA
)

data class UnidadEnterramiento(
    val id: String,
    val codigo: String,
    val bloque: String,
    val fila: Int,
    val columna: Int,
    val tipo: TipoUnidad = TipoUnidad.NICHO,
    val estado: EstadoNicho,
    val latitud: Double? = null,
    val longitud: Double? = null,
    val difuntos: List<Difunto> = emptyList(),
    val concesion: Concesion? = null,
    val notas: String = "",
    val esHuerfano: Boolean = false
)

data class BloqueNichos(
    val id: String,
    val nombre: String,
    val filas: Int,
    val columnas: Int,
    val totalNichos: Int = filas * columnas,
    val ocupados: Int = 0,
    val libres: Int = 0,
    val caducados: Int = 0,
    val pendientes: Int = 0
)

data class AlertaSistema(
    val id: String,
    val tipo: TipoAlerta,
    val titulo: String,
    val descripcion: String,
    val fechaAlerta: LocalDate,
    val unidadId: String? = null,
    val leida: Boolean = false
)

data class EstadisticasCementerio(
    val totalNichos: Int,
    val ocupados: Int,
    val libres: Int,
    val caducados: Int,
    val huerfanos: Int,
    val alertasActivas: Int,
    val ingresosMes: Double,
    val vencimientosProximos: Int
)
