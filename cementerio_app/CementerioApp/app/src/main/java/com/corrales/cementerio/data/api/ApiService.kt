package com.corrales.cementerio.data.api

import com.corrales.cementerio.data.model.*
import retrofit2.Response
import retrofit2.http.*
import retrofit2.http.Headers

interface ApiService {

    // ── Cementerios ───────────────────────────────────────────────────────────
    @GET("api/cementerios")
    suspend fun listarCementerios(): Response<List<CementerioResponse>>

    // ── Bloques ───────────────────────────────────────────────────────────────
    @GET("api/bloques/cementerio/{id}")
    suspend fun bloquesPorCementerio(@Path("id") id: Int): Response<List<BloqueResponse>>

    @POST("api/bloques")
    suspend fun crearBloque(@Body bloque: BloqueResponse): Response<BloqueResponse>

    @GET("api/bloques/{id}")
    suspend fun obtenerBloque(@Path("id") id: Int): Response<BloqueResponse>

    // ── Unidades ──────────────────────────────────────────────────────────────
    @GET("api/unidades/bloque/{id}")
    suspend fun unidadesPorBloque(@Path("id") id: Int): Response<List<UnidadResponse>>

    @GET("api/unidades/{id}")
    suspend fun obtenerUnidad(@Path("id") id: Int): Response<UnidadResponse>

    @POST("api/unidades/generar-estructura/{bloqueId}")
    @Headers("Accept: */*")        // La API devuelve text/plain, no JSON
    suspend fun generarEstructura(@Path("bloqueId") bloqueId: Int): Response<String>

    /** Actualiza estado de una unidad (ej: Libre → Ocupado tras inhumación) */
    @PUT("api/unidades/{id}")
    suspend fun actualizarUnidad(
        @Path("id") id: Int,
        @Body unidad: UnidadUpdateRequest
    ): Response<UnidadResponse>

    // ── Titulares ─────────────────────────────────────────────────────────────
    @POST("api/titulares")
    suspend fun guardarTitular(@Body titular: TitularRequest): Response<TitularResponse>

    @GET("api/titulares/documento/{doc}")
    suspend fun buscarTitularPorDoc(@Path("doc") doc: String): Response<TitularResponse>

    // ── Concesiones ───────────────────────────────────────────────────────────
    @GET("api/concesiones/unidad/{id}")
    suspend fun concesionesPorUnidad(@Path("id") id: Int): Response<List<ConcesionResponse>>

    @GET("api/concesiones/alertas")
    suspend fun alertasCaducidad(@Query("meses") meses: Int = 6): Response<List<ConcesionResponse>>

    /** Crea una concesión nueva vinculando titular + unidad */
    @POST("api/concesiones")
    suspend fun crearConcesion(@Body concesion: ConcesionRequest): Response<ConcesionResponse>

    // ── Restos ────────────────────────────────────────────────────────────────
    // Restos de una unidad concreta (para el expediente del nicho)
    @GET("api/restos/unidad/{unidadId}")
    suspend fun restosPorUnidad(@Path("unidadId") unidadId: Int): Response<List<RestosResponse>>

    @GET("api/restos/huerfanos")
    suspend fun restosHuerfanos(): Response<List<RestosResponse>>

    @GET("api/restos/buscar")
    suspend fun buscarRestos(@Query("nombre") nombre: String = ""): Response<List<RestosResponse>>

    @POST("api/restos")
    suspend fun crearResto(@Body resto: RestosRequest): Response<RestosResponse>

    @PUT("api/restos/{restoId}/vincular/{unidadId}")
    suspend fun vincularResto(
        @Path("restoId") restoId: Int,
        @Path("unidadId") unidadId: Int
    ): Response<RestosResponse>

    // ── Movimientos ───────────────────────────────────────────────────────────
    @GET("api/movimientos/resto/{id}")
    suspend fun movimientosPorResto(@Path("id") id: Int): Response<List<MovimientoResponse>>

    @POST("api/movimientos")
    suspend fun registrarMovimiento(@Body mov: MovimientoRequest): Response<MovimientoResponse>

    // ── Documentos ────────────────────────────────────────────────────────────
    @GET("api/documentos/unidad/{id}")
    suspend fun documentosPorUnidad(@Path("id") id: Int): Response<List<DocumentoResponse>>

    @POST("api/documentos")
    suspend fun guardarDocumento(@Body documento: DocumentoRequest): Response<DocumentoResponse>

    // ── Tasas ─────────────────────────────────────────────────────────────────────
    @GET("api/tasas-economicas/impagos")
    suspend fun tasasImpagadas(): Response<List<TasaResponse>>

    @GET("api/tasas-economicas")
    suspend fun todasLasTasas(): Response<List<TasaResponse>>

    @PUT("api/tasas-economicas/{id}/pagar")
    suspend fun procesarPago(@Path("id") id: Int): Response<TasaResponse>


    // ── Unidades — buscar todas ───────────────────────────────────────────────
    @GET("api/unidades")
    suspend fun listarTodasUnidades(): Response<List<UnidadResponse>>

    // ── Restos por unidad (para detalle de nicho) ─────────────────────────────
    @GET("api/restos/buscar")
    suspend fun buscarRestosPorNombre(@Query("nombre") nombre: String): Response<List<RestosResponse>>

    // ── Tasas por unidad ──────────────────────────────────────────────────────
    @GET("api/tasas-economicas/unidad/{unidadId}")
    suspend fun tasasPorUnidad(@Path("unidadId") unidadId: Int): Response<List<TasaResponse>>

    // ── Crear tasa ────────────────────────────────────────────────────────────
    @POST("api/tasas-economicas")
    suspend fun crearTasa(@Body tasa: TasaRequest): Response<TasaResponse>

    // ── Usuarios ──────────────────────────────────────────────────────────────
    @GET("api/usuarios")
    suspend fun listarUsuarios(): Response<List<UsuarioResponse>>

    @POST("api/usuarios/registrar")
    suspend fun registrarUsuario(@Body usuario: UsuarioRequest): Response<UsuarioResponse>
}
