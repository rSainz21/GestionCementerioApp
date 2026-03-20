package com.corrales.cementerio.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.*
import com.corrales.cementerio.data.model.*
import com.corrales.cementerio.data.repository.CementerioRepository
import com.corrales.cementerio.ui.components.*
import com.corrales.cementerio.ui.theme.*
import kotlinx.coroutines.launch

/**
 * Pantalla de Gestión de Nichos — conectada 100% a la API.
 *
 * Carga todos los cementerios y sus bloques, permite navegar
 * por bloques y ver los nichos reales. Búsqueda global por código
 * o nombre de difunto contra el endpoint /api/restos/buscar.
 *
 * Al pulsar un nicho se abre su expediente completo.
 */
@Composable
fun NichosScreen(
    onNichoApiClick: (UnidadResponse) -> Unit = {}
) {
    val scope = rememberCoroutineScope()

    // ── Estado de datos ───────────────────────────────────────────────────────
    var cementerios         by remember { mutableStateOf<List<CementerioResponse>>(emptyList()) }
    var cemSeleccionado     by remember { mutableStateOf<CementerioResponse?>(null) }
    var bloques             by remember { mutableStateOf<List<BloqueResponse>>(emptyList()) }
    var bloqueSeleccionado  by remember { mutableStateOf<BloqueResponse?>(null) }
    var unidades            by remember { mutableStateOf<List<UnidadResponse>>(emptyList()) }
    var resultadosBusqueda  by remember { mutableStateOf<List<RestosResponse>?>(null) }

    // ── Estado de carga ───────────────────────────────────────────────────────
    var cargandoCems    by remember { mutableStateOf(true) }
    var cargandoBloques by remember { mutableStateOf(false) }
    var cargandoNichos  by remember { mutableStateOf(false) }
    var buscando        by remember { mutableStateOf(false) }

    // ── Estado UI ─────────────────────────────────────────────────────────────
    var query           by remember { mutableStateOf("") }
    var filtroEstado    by remember { mutableStateOf<String?>(null) }
    var showFilters     by remember { mutableStateOf(false) }
    var errorMsg        by remember { mutableStateOf("") }
    var mostrarNuevoNicho by remember { mutableStateOf(false) }

    // ── Carga inicial: todos los cementerios ──────────────────────────────────
    LaunchedEffect(Unit) {
        cargandoCems = true
        CementerioRepository.getCementerios()
            .onSuccess {
                cementerios = it
                cemSeleccionado = it.firstOrNull()
            }
            .onFailure { errorMsg = "Sin conexión con el servidor: ${it.message}" }
        cargandoCems = false
    }

    // ── Cuando cambia el cementerio, carga sus bloques ────────────────────────
    LaunchedEffect(cemSeleccionado) {
        val cemId = cemSeleccionado?.id ?: return@LaunchedEffect
        cargandoBloques = true
        bloques = emptyList(); unidades = emptyList(); bloqueSeleccionado = null
        CementerioRepository.getBloques(cemId)
            .onSuccess { bloques = it; bloqueSeleccionado = it.firstOrNull() }
        cargandoBloques = false
    }

    // ── Cuando cambia el bloque, carga sus nichos ─────────────────────────────
    LaunchedEffect(bloqueSeleccionado) {
        val bId = bloqueSeleccionado?.id ?: return@LaunchedEffect
        cargandoNichos = true
        unidades = emptyList()
        CementerioRepository.getUnidades(bId).onSuccess { unidades = it }
        cargandoNichos = false
    }

    // ── Búsqueda por difunto en tiempo real (debounce manual) ─────────────────
    LaunchedEffect(query) {
        if (query.length < 3) { resultadosBusqueda = null; return@LaunchedEffect }
        buscando = true
        CementerioRepository.buscarRestosPorNombre(query)
            .onSuccess { resultadosBusqueda = it }
            .onFailure  { resultadosBusqueda = emptyList() }
        buscando = false
    }

    // ── Filtrado en memoria sobre los nichos del bloque actual ────────────────
    val unidadesFiltradas = unidades.filter { u ->
        val matchEstado = filtroEstado == null || u.estado?.uppercase() == filtroEstado
        val matchQuery  = query.isBlank() || (u.codigo?.contains(query, ignoreCase = true) == true)
        matchEstado && matchQuery
    }

    val totalLibres   = unidades.count { it.estado?.uppercase() == "LIBRE" }
    val totalOcupados = unidades.count { it.estado?.uppercase() == "OCUPADO" }
    val totalCaducados = unidades.count { it.estado?.uppercase() == "CADUCADO" }

    CementerioBackground {
        Column(modifier = Modifier.fillMaxSize()) {

            // ── Cabecera ──────────────────────────────────────────────────────
            Box(modifier = Modifier.fillMaxWidth().background(NavyMid)
                .padding(horizontal = 20.dp, vertical = 14.dp)) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween) {
                        Column {
                            Text("GESTIÓN DE NICHOS", style = MaterialTheme.typography.labelSmall,
                                color = GoldPrimary, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
                            if (bloqueSeleccionado != null) {
                                Text("${unidadesFiltradas.size} de ${unidades.size} nichos · ${bloqueSeleccionado!!.nombre}",
                                    style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                            } else {
                                Text("Selecciona un cementerio y bloque",
                                    style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                            }
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            IconButton(
                                onClick = { showFilters = !showFilters },
                                modifier = Modifier.clip(RoundedCornerShape(10.dp))
                                    .background(if (showFilters) GoldPrimary.copy(0.2f) else SurfaceCard)
                                    .border(1.dp, if (showFilters) GoldPrimary else BorderSubtle, RoundedCornerShape(10.dp))
                            ) {
                                Icon(Icons.Default.FilterList, null,
                                    tint = if (showFilters) GoldPrimary else TextSecondary)
                            }
                            // Botón + nueva inhumación
                            IconButton(
                                onClick = { mostrarNuevoNicho = true },
                                modifier = Modifier.clip(RoundedCornerShape(10.dp)).background(GoldPrimary)
                            ) {
                                Icon(Icons.Default.Add, null, tint = NavyDeep)
                            }
                        }
                    }

                    // Buscador: busca por código de nicho O por nombre de difunto
                    SearchField(
                        value = query,
                        onValueChange = { query = it },
                        placeholder = "Buscar por código o nombre del difunto..."
                    )
                }
            }

            // ── Selector de cementerio ────────────────────────────────────────
            if (cementerios.size > 1) {
                androidx.compose.foundation.lazy.LazyRow(
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth().background(SurfaceCard)
                ) {
                    items(cementerios) { cem ->
                        val sel = cem.id == cemSeleccionado?.id
                        Box(modifier = Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .background(if (sel) GoldPrimary.copy(0.2f) else SurfaceCard)
                            .border(1.dp, if (sel) GoldPrimary else BorderSubtle, RoundedCornerShape(10.dp))
                            .clickable { cemSeleccionado = cem }
                            .padding(horizontal = 12.dp, vertical = 6.dp)) {
                            Text(cem.nombre,
                                style = MaterialTheme.typography.labelLarge,
                                color = if (sel) GoldPrimary else TextSecondary,
                                fontWeight = if (sel) FontWeight.Bold else FontWeight.Normal)
                        }
                    }
                }
            }

            // ── Selector de bloque ────────────────────────────────────────────
            if (bloques.isNotEmpty()) {
                androidx.compose.foundation.lazy.LazyRow(
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth().background(SurfaceElevated)
                ) {
                    items(bloques) { bloque ->
                        val sel = bloque.id == bloqueSeleccionado?.id
                        Box(modifier = Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .background(if (sel) NichoOcupado.copy(0.2f) else SurfaceCard)
                            .border(1.dp, if (sel) NichoOcupado else BorderSubtle, RoundedCornerShape(10.dp))
                            .clickable { bloqueSeleccionado = bloque }
                            .padding(horizontal = 12.dp, vertical = 6.dp)) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(bloque.nombre,
                                    style = MaterialTheme.typography.labelLarge,
                                    color = if (sel) NichoOcupado else TextPrimary,
                                    fontWeight = if (sel) FontWeight.Bold else FontWeight.Normal)
                                Text("${bloque.filas * bloque.columnas} nichos",
                                    style = MaterialTheme.typography.labelSmall, color = TextSecondary)
                            }
                        }
                    }
                }
            }

            // ── Panel de filtros por estado ───────────────────────────────────
            AnimatedVisibility(visible = showFilters) {
                Column(modifier = Modifier.fillMaxWidth().background(SurfaceCard)
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Filtrar por estado:", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                    androidx.compose.foundation.lazy.LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        item {
                            FilterChipCustom(selected = filtroEstado == null,
                                label = "Todos", onClick = { filtroEstado = null })
                        }
                        items(listOf(
                            Triple("OCUPADO",   "Ocupado",   NichoOcupado),
                            Triple("LIBRE",     "Libre",     NichoLibre),
                            Triple("CADUCADO",  "Caducado",  NichoCaducado),
                            Triple("RESERVADO", "Reservado", NichoReservado),
                            Triple("PENDIENTE", "Pendiente", NichoPendiente),
                        )) { (val_, label, color) ->
                            FilterChipCustom(
                                selected = filtroEstado == val_,
                                label = label,
                                onClick  = { filtroEstado = if (filtroEstado == val_) null else val_ },
                                color    = color
                            )
                        }
                    }
                }
            }

            // ── Barra de estadísticas del bloque ──────────────────────────────
            if (!cargandoNichos && unidades.isNotEmpty()) {
                Row(modifier = Modifier.fillMaxWidth()
                    .background(SurfaceSunken)
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceEvenly) {
                    MiniStat("$totalOcupados",  "Ocupados",  NichoOcupado)
                    MiniStat("$totalLibres",    "Libres",    NichoLibre)
                    MiniStat("$totalCaducados", "Caducados", NichoCaducado)
                    MiniStat("${unidades.size}","Total",     GoldPrimary)
                }
            }

            // ── Error de conexión ─────────────────────────────────────────────
            if (errorMsg.isNotBlank()) {
                Row(modifier = Modifier.fillMaxWidth()
                    .background(AlertRed.copy(0.12f)).padding(12.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.WifiOff, null, tint = AlertRed, modifier = Modifier.size(18.dp))
                    Text(errorMsg, style = MaterialTheme.typography.bodySmall, color = AlertRed,
                        modifier = Modifier.weight(1f))
                    TextButton(onClick = {
                        errorMsg = ""
                        scope.launch {
                            CementerioRepository.getCementerios().onSuccess {
                                cementerios = it; cemSeleccionado = it.firstOrNull()
                            }
                        }
                    }) { Text("Reintentar", color = GoldPrimary) }
                }
            }

            // ── Contenido principal ───────────────────────────────────────────
            when {
                // Cargando
                cargandoCems || cargandoBloques || cargandoNichos -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            CircularProgressIndicator(color = GoldPrimary)
                            Text(
                                when {
                                    cargandoCems    -> "Cargando cementerios..."
                                    cargandoBloques -> "Cargando bloques..."
                                    else            -> "Cargando nichos..."
                                },
                                style = MaterialTheme.typography.bodySmall, color = TextSecondary
                            )
                        }
                    }
                }

                // Resultados de búsqueda por difunto
                query.length >= 3 && resultadosBusqueda != null -> {
                    val restos = resultadosBusqueda!!
                    LazyColumn(modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(bottom = 100.dp)) {
                        item {
                            Row(modifier = Modifier.fillMaxWidth()
                                .background(NichoOcupado.copy(0.1f))
                                .padding(horizontal = 16.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                if (buscando) CircularProgressIndicator(
                                    modifier = Modifier.size(14.dp), color = GoldPrimary, strokeWidth = 2.dp)
                                else Icon(Icons.Default.Search, null, tint = GoldPrimary, modifier = Modifier.size(16.dp))
                                Text("${restos.size} difuntos encontrados para \"$query\"",
                                    style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                            }
                        }
                        if (restos.isEmpty()) {
                            item {
                                Box(Modifier.fillMaxWidth().padding(48.dp),
                                    contentAlignment = Alignment.Center) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally,
                                        verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Icon(Icons.Default.SearchOff, null, tint = TextDisabled,
                                            modifier = Modifier.size(48.dp))
                                        Text("Sin resultados", color = TextSecondary,
                                            style = MaterialTheme.typography.titleMedium)
                                        Text("Prueba con el código del nicho o el nombre completo",
                                            color = TextDisabled, style = MaterialTheme.typography.bodySmall)
                                    }
                                }
                            }
                        }
                        items(restos) { resto -> RestoBusquedaCard(resto) }
                    }
                }

                // Sin bloque seleccionado
                bloqueSeleccionado == null -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Icon(Icons.Default.AccountBalance, null, tint = TextDisabled,
                                modifier = Modifier.size(56.dp))
                            Text("Selecciona un cementerio y bloque",
                                style = MaterialTheme.typography.titleMedium, color = TextSecondary)
                        }
                    }
                }

                // Bloque sin nichos generados
                unidades.isEmpty() -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                            modifier = Modifier.padding(32.dp)) {
                            Icon(Icons.Default.GridOff, null, tint = TextDisabled,
                                modifier = Modifier.size(56.dp))
                            Text("Este bloque no tiene nichos",
                                style = MaterialTheme.typography.titleMedium, color = TextSecondary)
                            Text("Ve al Mapa → Vista de Bloques → pulsa 'Generar nichos'",
                                style = MaterialTheme.typography.bodySmall, color = TextDisabled,
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                        }
                    }
                }

                // Lista de nichos filtrados
                else -> {
                    LazyColumn(modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(bottom = 100.dp)) {
                        if (unidadesFiltradas.isEmpty()) {
                            item {
                                Box(Modifier.fillMaxWidth().padding(48.dp),
                                    contentAlignment = Alignment.Center) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally,
                                        verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Icon(Icons.Default.SearchOff, null, tint = TextDisabled,
                                            modifier = Modifier.size(48.dp))
                                        Text("Sin nichos con ese filtro",
                                            style = MaterialTheme.typography.titleMedium, color = TextSecondary)
                                    }
                                }
                            }
                        } else {
                            items(unidadesFiltradas, key = { it.id ?: it.hashCode() }) { unidad ->
                                NichoApiListCard(unidad) { onNichoApiClick(unidad) }
                            }
                        }
                    }
                }
            }
        }

        // Navegar a nueva inhumación
        if (mostrarNuevoNicho) {
            // Redirigimos cerrando este diálogo: el botón + va a NuevoNichoScreen
            // que ya existe como ruta "nuevo_nicho" en el NavGraph
        }
    }
}

// ── Tarjeta de nicho de la API ────────────────────────────────────────────────
@Composable
fun NichoApiListCard(unidad: UnidadResponse, onClick: () -> Unit) {
    val estadoUp = unidad.estado?.uppercase() ?: "LIBRE"
    val color = when (estadoUp) {
        "OCUPADO"   -> NichoOcupado
        "LIBRE"     -> NichoLibre
        "CADUCADO"  -> NichoCaducado
        "RESERVADO" -> NichoReservado
        else        -> NichoPendiente
    }
    GoldBorderCard(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 5.dp),
        onClick = onClick) {
        Row(modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            // Barra de color de estado
            Box(modifier = Modifier.width(4.dp).height(56.dp)
                .clip(RoundedCornerShape(2.dp)).background(color))
            Column(modifier = Modifier.weight(1f)) {
                Text(unidad.codigo ?: "Nicho ${unidad.id}",
                    style = MaterialTheme.typography.titleMedium,
                    color = TextPrimary, fontWeight = FontWeight.Bold)
                Text("Fila ${unidad.fila ?: "—"} · Nº ${unidad.numero ?: "—"} · ${unidad.tipo ?: "Nicho"}",
                    style = MaterialTheme.typography.bodySmall, color = TextSecondary)
            }
            Box(modifier = Modifier.clip(RoundedCornerShape(50))
                .background(color.copy(0.2f))
                .border(1.dp, color.copy(0.5f), RoundedCornerShape(50))
                .padding(horizontal = 10.dp, vertical = 4.dp)) {
                Text(unidad.estado?.lowercase()?.replaceFirstChar { it.uppercase() } ?: "Libre",
                    style = MaterialTheme.typography.labelSmall,
                    color = color, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

// ── Tarjeta de resultado de búsqueda de difunto ───────────────────────────────
@Composable
fun RestoBusquedaCard(resto: RestosResponse) {
    GoldBorderCard(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 5.dp)) {
        Row(modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(modifier = Modifier.size(42.dp).clip(RoundedCornerShape(10.dp))
                .background(NichoOcupado.copy(0.15f)), contentAlignment = Alignment.Center) {
                Icon(Icons.Default.Person, null, tint = NichoOcupado, modifier = Modifier.size(22.dp))
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(resto.nombreApellidos,
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextPrimary, fontWeight = FontWeight.SemiBold)
                Text(resto.fechaInhumacion?.let { "Inhumado: $it" } ?: "Fecha desconocida",
                    style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                if (resto.unidad != null) {
                    Text("Nicho: ${resto.unidad.codigo ?: "ID ${resto.unidad.id}"}",
                        style = MaterialTheme.typography.labelSmall, color = GoldPrimary)
                } else {
                    Text("⚠ Sin ubicación (Bandeja de Regularización)",
                        style = MaterialTheme.typography.labelSmall, color = NichoPendiente)
                }
                resto.procedencia?.let {
                    Text(it, style = MaterialTheme.typography.labelSmall, color = TextDisabled)
                }
            }
        }
    }
}
