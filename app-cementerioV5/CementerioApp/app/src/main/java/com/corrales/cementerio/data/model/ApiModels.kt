package com.corrales.cementerio.data.model

import com.google.gson.annotations.SerializedName

// ── Cementerio ────────────────────────────────────────────────────────────────
data class CementerioResponse(
    val id: Int? = null,
    val nombre: String = "",
    val direccion: String? = null,
    val notas: String? = null,
    val creadoEn: String? = null
)

// ── Bloque ────────────────────────────────────────────────────────────────────
data class BloqueResponse(
    val id: Int? = null,
    val cementerio: CementerioResponse? = null,
    val nombre: String = "",
    val filas: Int = 0,
    val columnas: Int = 0,
    val sentidoNumeracion: String? = null
)

// ── Unidad de enterramiento ───────────────────────────────────────────────────
data class UnidadResponse(
    val id: Int? = null,
    val bloque: BloqueResponse? = null,
    val codigo: String? = null,
    val tipo: String? = null,    // Nicho, Tumba, Panteón, Columbario
    val fila: Int? = null,
    val numero: Int? = null,
    val estado: String? = null,  // Ocupado, Caducado, Libre, Reservado
    val latitud: Double? = null,
    val longitud: Double? = null
)

// ── Titular ───────────────────────────────────────────────────────────────────
data class TitularResponse(
    val id: Int? = null,
    val nombreApellidos: String = "",
    val documento: String? = null,
    val telefono: String? = null,
    val email: String? = null,
    val direccion: String? = null
)

data class TitularRequest(
    val nombreApellidos: String,
    val documento: String? = null,
    val telefono: String? = null,
    val email: String? = null,
    val direccion: String? = null
)

// ── Concesión ─────────────────────────────────────────────────────────────────
data class ConcesionResponse(
    val id: Int? = null,
    @SerializedName("unidadEnterramiento") val unidad: UnidadResponse? = null,
    val titular: TitularResponse? = null,
    val fechaInicio: String? = null,
    val fechaVencimiento: String? = null,
    val estado: String? = null,       // Vigente, Caducada
    val observaciones: String? = null
)

// ── Restos ────────────────────────────────────────────────────────────────────
data class RestosResponse(
    val id: Int? = null,
    val unidad: UnidadResponse? = null,
    val nombreApellidos: String = "",
    val fechaInhumacion: String? = null,
    val procedencia: String? = null,
    val notasHistoricas: String? = null,
    val fechaMovimiento: String? = null,
    val creadoEn: String? = null
)

data class RestosRequest(
    val nombreApellidos: String,
    val fechaInhumacion: String? = null,
    val procedencia: String? = null,
    val notasHistoricas: String? = null
)

// ── Movimiento ────────────────────────────────────────────────────────────────
data class MovimientoResponse(
    val id: Int? = null,
    val resto: RestosResponse? = null,
    val tipoMovimiento: String = "",  // Inhumación, Exhumación, Traslado
    val fechaMovimiento: String = "",
    val origen: UnidadResponse? = null,
    val destino: UnidadResponse? = null,
    val notas: String? = null
)

data class MovimientoRequest(
    val resto: IdWrapper,             // { "id": 5 }
    val tipoMovimiento: String,       // "Inhumación", "Exhumación", "Traslado"
    val fechaMovimiento: String,      // "yyyy-MM-dd"
    val origen: IdWrapper? = null,    // unidad origen (para traslados)
    val destino: IdWrapper? = null,   // unidad destino (para traslados e inhumaciones)
    val notas: String? = null
)

// ── Documento ─────────────────────────────────────────────────────────────────
data class DocumentoResponse(
    val id: Int? = null,
    @SerializedName("unidadEnterramiento") val unidad: UnidadResponse? = null,
    @SerializedName("tipoDocumento") val tipo: String = "",
    @SerializedName("urlArchivo") val urlArchivo: String = ""
)


data class DocumentoRequest(
    @SerializedName("unidadEnterramiento") val unidadEnterramiento: IdWrapper,
    @SerializedName("tipoDocumento") val tipoDocumento: String,
    @SerializedName("urlArchivo") val urlArchivo: String
)

// ── Tasa económica ────────────────────────────────────────────────────────────
data class TasaResponse(
    val id: Int? = null,
    val unidad: UnidadResponse? = null,
    val titular: TitularResponse? = null,
    val concepto: String = "",
    val importe: Double = 0.0,
    val estadoPago: String = "",  // PAGADO, PENDIENTE, IMPAGO
    val fechaEmision: String = "",
    val fechaPago: String? = null
)

// ── Usuario ───────────────────────────────────────────────────────────────────
data class UsuarioResponse(
    val id: Int? = null,
    val username: String = "",
    val password: String? = null,
    val rol: String = "",           // ADMIN, OPERARIO
    val creadoEn: String? = null
)

data class UsuarioRequest(
    val username: String,
    val password: String,
    val rol: String = "OPERARIO"
)

// ── Session (guardada localmente) ─────────────────────────────────────────────
data class SessionData(
    val userId: Int,
    val username: String,
    val rol: String          // ADMIN, OPERARIO
)

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST bodies para crear registros

data class UnidadUpdateRequest(
    val estado: String? = null,
    val codigo: String? = null,
    val latitud: Double? = null,
    val longitud: Double? = null
)

/**
 * Body para POST /api/concesiones.
 * La API espera los IDs de unidad y titular como objetos anidados con solo el id.
 */
data class ConcesionRequest(
    val unidadEnterramiento: IdWrapper,
    val titular: IdWrapper,
    val fechaInicio: String,
    val fechaVencimiento: String,
    val estado: String = "Vigente",
    val observaciones: String? = null
)

/** Wrapper mínimo para enviar solo el ID de una entidad relacionada */
data class IdWrapper(val id: Int)
