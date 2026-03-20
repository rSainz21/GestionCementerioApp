package com.corrales.cementerio.data.repository

import com.corrales.cementerio.data.api.RetrofitClient
import com.corrales.cementerio.data.model.*

/**
 * Capa de repositorio: aísla la UI de la fuente de datos.
 * Todas las funciones son suspend y devuelven Result<T>.
 */
object CementerioRepository {

    private val api = RetrofitClient.api

    // ── Autenticación (sin JWT: comparamos usuario en la lista) ───────────────
    suspend fun login(username: String, password: String): Result<SessionData> = runCatching {
        val response = api.listarUsuarios()
        val usuarios = response.body() ?: error("Sin respuesta del servidor")
        val usuario = usuarios.find { it.username.equals(username, ignoreCase = true) }
            ?: error("Usuario no encontrado")
        // En producción reemplazar por endpoint /api/auth/login con JWT
        // Aquí aceptamos cualquier contraseña ya que BCrypt está en el servidor
        SessionData(
            userId = usuario.id ?: 0,
            username = usuario.username,
            rol = usuario.rol
        )
    }

    // ── Cementerios ───────────────────────────────────────────────────────────
    suspend fun getCementerios(): Result<List<CementerioResponse>> = runCatching {
        api.listarCementerios().body() ?: emptyList()
    }

    // ── Bloques ───────────────────────────────────────────────────────────────
    suspend fun getBloques(cementerioId: Int): Result<List<BloqueResponse>> = runCatching {
        api.bloquesPorCementerio(cementerioId).body() ?: emptyList()
    }

    suspend fun crearBloque(bloque: BloqueResponse): Result<BloqueResponse> = runCatching {
        api.crearBloque(bloque).body() ?: error("Error al crear bloque")
    }

    // ── Unidades ──────────────────────────────────────────────────────────────
    suspend fun obtenerUnidad(id: Int): Result<UnidadResponse> = runCatching {
        api.obtenerUnidad(id).body() ?: error("Unidad no encontrada")
    }

    suspend fun getUnidades(bloqueId: Int): Result<List<UnidadResponse>> = runCatching {
        api.unidadesPorBloque(bloqueId).body() ?: emptyList()
    }

    suspend fun generarEstructura(bloqueId: Int): Result<String> = runCatching {
        val response = api.generarEstructura(bloqueId)
        if (response.isSuccessful) "Estructura generada correctamente"
        else error("Error HTTP ${response.code()}: ${response.message()}")
    }

    // ── Concesiones ───────────────────────────────────────────────────────────
    suspend fun getConcesiones(unidadId: Int): Result<List<ConcesionResponse>> = runCatching {
        api.concesionesPorUnidad(unidadId).body() ?: emptyList()
    }

    suspend fun getAlertasCaducidad(meses: Int = 6): Result<List<ConcesionResponse>> = runCatching {
        api.alertasCaducidad(meses).body() ?: emptyList()
    }

    // ── Restos ────────────────────────────────────────────────────────────────
    suspend fun getRestosPorUnidad(unidadId: Int): Result<List<RestosResponse>> = runCatching {
        api.restosPorUnidad(unidadId).body() ?: emptyList()
    }

    suspend fun getRestosHuerfanos(): Result<List<RestosResponse>> = runCatching {
        api.restosHuerfanos().body() ?: emptyList()
    }

    suspend fun buscarRestos(nombre: String): Result<List<RestosResponse>> = runCatching {
        api.buscarRestos(nombre).body() ?: emptyList()
    }

    suspend fun vincularResto(restoId: Int, unidadId: Int): Result<RestosResponse> = runCatching {
        api.vincularResto(restoId, unidadId).body() ?: error("Error al vincular")
    }

    suspend fun crearResto(request: RestosRequest): Result<RestosResponse> = runCatching {
        api.crearResto(request).body() ?: error("Error al crear resto")
    }

    // ── Movimientos ───────────────────────────────────────────────────────────
    suspend fun getMovimientos(restoId: Int): Result<List<MovimientoResponse>> = runCatching {
        api.movimientosPorResto(restoId).body() ?: emptyList()
    }

    suspend fun registrarMovimiento(request: MovimientoRequest): Result<MovimientoResponse> = runCatching {
        api.registrarMovimiento(request).body() ?: error("Error al registrar")
    }

    // ── Documentos ────────────────────────────────────────────────────────────
    suspend fun getDocumentos(unidadId: Int): Result<List<DocumentoResponse>> = runCatching {
        api.documentosPorUnidad(unidadId).body() ?: emptyList()
    }

    // ── Documentos - guardar ──────────────────────────────────────────────────
    suspend fun guardarDocumento(request: DocumentoRequest): Result<DocumentoResponse> = runCatching {
        api.guardarDocumento(request).body() ?: error("Error al guardar documento")
    }


    // ── Tasas ─────────────────────────────────────────────────────────────────
    suspend fun getTasasImpagadas(): Result<List<TasaResponse>> = runCatching {
        api.tasasImpagadas().body() ?: emptyList()
    }

    suspend fun getTodasTasas(): Result<List<TasaResponse>> = runCatching {
        api.todasLasTasas().body() ?: emptyList()
    }

    suspend fun procesarPago(tasaId: Int): Result<TasaResponse> = runCatching {
        api.procesarPago(tasaId).body() ?: error("Error al procesar pago")
    }


    // ── Unidades — todas (para búsqueda global) ───────────────────────────────
    suspend fun listarTodasUnidades(): Result<List<UnidadResponse>> = runCatching {
        api.listarTodasUnidades().body() ?: emptyList()
    }


    // ── Restos de una unidad concreta (filtrado en cliente) ───────────────────
    suspend fun getRestosDeUnidad(unidadId: Int): Result<List<RestosResponse>> = runCatching {
        // La API no tiene /restos/unidad/{id}, filtramos todos los restos
        val todos = api.buscarRestos("").body() ?: emptyList()
        todos.filter { it.unidad?.id == unidadId }
    }

    // ── Restos por nombre ─────────────────────────────────────────────────────
    suspend fun buscarRestosPorNombre(nombre: String): Result<List<RestosResponse>> = runCatching {
        api.buscarRestosPorNombre(nombre).body() ?: emptyList()
    }

    // ── Tasas por unidad ──────────────────────────────────────────────────────
    suspend fun getTasasPorUnidad(unidadId: Int): Result<List<TasaResponse>> = runCatching {
        // Filtramos del endpoint general ya que la API no tiene /unidad/{id} en tasas
        api.todasLasTasas().body()?.filter { it.unidad?.id == unidadId } ?: emptyList()
    }

    // ── Crear tasa ────────────────────────────────────────────────────────────
    suspend fun crearTasa(request: TasaRequest): Result<TasaResponse> = runCatching {
        api.crearTasa(request).body() ?: error("Error al crear tasa")
    }

    // ── Titulares ─────────────────────────────────────────────────────────────
    suspend fun guardarTitular(request: TitularRequest): Result<TitularResponse> = runCatching {
        api.guardarTitular(request).body() ?: error("Error al guardar titular")
    }

    suspend fun buscarTitularPorDoc(doc: String): Result<TitularResponse> = runCatching {
        api.buscarTitularPorDoc(doc).body() ?: error("Titular no encontrado")
    }
    // ── Unidades - actualizar estado ──────────────────────────────────────────
    suspend fun actualizarEstadoUnidad(unidadId: Int, nuevoEstado: String): Result<UnidadResponse> = runCatching {
        api.actualizarUnidad(unidadId, UnidadUpdateRequest(estado = nuevoEstado))
            .body() ?: error("Error al actualizar unidad")
    }

    // ── Concesiones - crear ───────────────────────────────────────────────────
    suspend fun crearConcesion(request: ConcesionRequest): Result<ConcesionResponse> = runCatching {
        api.crearConcesion(request).body() ?: error("Error al crear concesión")
    }

}
