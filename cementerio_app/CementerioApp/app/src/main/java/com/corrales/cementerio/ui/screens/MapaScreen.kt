package com.corrales.cementerio.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.*
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.*
import androidx.compose.ui.viewinterop.AndroidView
import com.corrales.cementerio.data.model.*
import com.corrales.cementerio.data.repository.CementerioRepository
import com.corrales.cementerio.ui.components.*
import com.corrales.cementerio.ui.theme.*
import com.google.android.gms.maps.model.LatLng
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter

private val CEMENTERIO_LATLNG = LatLng(43.2510, -4.0580)

// ─── Modelo local para representar un nicho de la API en el grid ──────────────
data class NichoGrid(
    val unidadId: Int,
    val codigo: String,
    val fila: Int,
    val numero: Int,
    val estado: String,    // "Libre", "Ocupado", "Caducado", "Reservado"
)

@Composable
fun MapaScreen(onNichoApiClick: (Int) -> Unit = {}) {
    var vistaActiva        by remember { mutableIntStateOf(0) }
    // Datos de la API
    var bloques            by remember { mutableStateOf<List<BloqueResponse>>(emptyList()) }
    var bloqueSeleccionado by remember { mutableStateOf<BloqueResponse?>(null) }
    var nichosApi          by remember { mutableStateOf<List<UnidadResponse>>(emptyList()) }
    var cargandoBloques    by remember { mutableStateOf(true) }
    var cargandoNichos     by remember { mutableStateOf(false) }
    // Nicho seleccionado en el grid → abre el bottom sheet
    var nichoApiSeleccionado    by remember { mutableStateOf<UnidadResponse?>(null) }
    var mostrarCrearBloque      by remember { mutableStateOf(false) }
    var generandoEstructura     by remember { mutableStateOf(false) }
    var mensajeGeneracion       by remember { mutableStateOf("") }
    // Zoom/pan del grid
    var scale   by remember { mutableFloatStateOf(1f) }
    var offsetX by remember { mutableFloatStateOf(0f) }
    var offsetY by remember { mutableFloatStateOf(0f) }

    val scope = rememberCoroutineScope()

    // Cargar bloques al iniciar
    LaunchedEffect(Unit) {
        CementerioRepository.getCementerios().onSuccess { cems ->
            cems.firstOrNull()?.id?.let { cemId ->
                CementerioRepository.getBloques(cemId).onSuccess {
                    bloques = it
                    bloqueSeleccionado = it.firstOrNull()
                }
            }
        }
        cargandoBloques = false
    }

    // Cargar nichos del bloque seleccionado
    LaunchedEffect(bloqueSeleccionado) {
        bloqueSeleccionado?.id?.let { bid ->
            cargandoNichos = true
            scale = 1f; offsetX = 0f; offsetY = 0f
            CementerioRepository.getUnidades(bid).onSuccess { nichosApi = it }
            cargandoNichos = false
        }
    }

    CementerioBackground {
        Column(modifier = Modifier.fillMaxSize()) {

            // ── Header ────────────────────────────────────────────────────────
            Box(modifier = Modifier.fillMaxWidth().background(NavyMid)
                .padding(horizontal = 20.dp, vertical = 14.dp)) {
                Row(modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween) {
                    Column {
                        Text("MAPA INTERACTIVO", style = MaterialTheme.typography.labelSmall,
                            color = GoldPrimary, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
                        Text("Cementerio Municipal · Los Corrales",
                            style = MaterialTheme.typography.titleMedium,
                            color = TextPrimary, fontWeight = FontWeight.Bold)
                    }
                    if (vistaActiva == 1) {
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            ZoomButton("+") { scale = (scale * 1.3f).coerceAtMost(5f) }
                            ZoomButton("−") { scale = (scale / 1.3f).coerceAtLeast(0.4f) }
                            ZoomButton("⊙") { scale = 1f; offsetX = 0f; offsetY = 0f }
                        }
                    }
                }
            }

            // ── Tabs ──────────────────────────────────────────────────────────
            TabRow(selectedTabIndex = vistaActiva,
                containerColor = SurfaceCard, contentColor = GoldPrimary,
                indicator = { tabPositions ->
                    TabRowDefaults.SecondaryIndicator(
                        modifier = Modifier.tabIndicatorOffset(tabPositions[vistaActiva]),
                        color = GoldPrimary)
                }
            ) {
                listOf(Pair(Icons.Default.Map, "Mapa Satélite"),
                       Pair(Icons.Default.GridView, "Vista de Bloques"))
                    .forEachIndexed { i, (icon, label) ->
                        Tab(selected = vistaActiva == i, onClick = { vistaActiva = i },
                            icon = { Icon(icon, null, modifier = Modifier.size(18.dp)) },
                            text = {
                                Text(label,
                                    color = if (vistaActiva == i) GoldPrimary else TextSecondary,
                                    style = MaterialTheme.typography.labelLarge,
                                    fontWeight = if (vistaActiva == i) FontWeight.Bold else FontWeight.Normal)
                            })
                    }
            }

            when (vistaActiva) {
                0 -> GoogleMapsView(onNichoApiClick = onNichoApiClick)
                1 -> BloquesApiView(
                    bloques            = bloques,
                    bloqueSeleccionado = bloqueSeleccionado,
                    nichosApi          = nichosApi,
                    cargandoBloques    = cargandoBloques,
                    cargandoNichos     = cargandoNichos,
                    scale = scale, offsetX = offsetX, offsetY = offsetY,
                    onBloqueChange     = { bloqueSeleccionado = it },
                    onNichoTap         = { nichoApiSeleccionado = it },
                    onScaleChange      = { s, ox, oy -> scale = s; offsetX = ox; offsetY = oy },
                    onGenerarEstructura = { bloque ->
                        scope.launch {
                            generandoEstructura = true
                            mensajeGeneracion   = ""
                            bloque.id?.let { bid ->
                                CementerioRepository.generarEstructura(bid)
                                    .onSuccess {
                                        mensajeGeneracion = "✓ Estructura generada para '${bloque.nombre}'"
                                        // Recargar nichos del bloque
                                        CementerioRepository.getUnidades(bid).onSuccess { nichosApi = it }
                                    }
                                    .onFailure { mensajeGeneracion = "✗ Error: ${it.message}" }
                            }
                            generandoEstructura = false
                        }
                    },
                    onCrearBloque = { mostrarCrearBloque = true }
                )
            }
        }

        // ── Snackbar de resultado de generación ──────────────────────────────
        AnimatedVisibility(
            visible = mensajeGeneracion.isNotBlank(),
            modifier = Modifier.align(Alignment.TopCenter)
        ) {
            val isError = mensajeGeneracion.startsWith("✗")
            Row(
                modifier = Modifier
                    .padding(top = 16.dp, start = 16.dp, end = 16.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(if (isError) AlertRed.copy(0.9f) else AlertGreen.copy(0.9f))
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Icon(
                    if (isError) Icons.Default.ErrorOutline else Icons.Default.CheckCircle,
                    null, tint = Color.White, modifier = Modifier.size(18.dp)
                )
                Text(mensajeGeneracion, color = Color.White,
                    style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.weight(1f))
                IconButton(onClick = { mensajeGeneracion = "" }, modifier = Modifier.size(20.dp)) {
                    Icon(Icons.Default.Close, null, tint = Color.White, modifier = Modifier.size(16.dp))
                }
            }
        }

        // ── Diálogo crear nuevo bloque ────────────────────────────────────────
        if (mostrarCrearBloque) {
            DialogCrearBloque(
                cementerioId = bloques.firstOrNull()?.cementerio?.id ?: 1,
                onDismiss = { mostrarCrearBloque = false },
                onCreado = { nuevoBloque ->
                    mostrarCrearBloque = false
                    scope.launch {
                        bloques = bloques + nuevoBloque
                        bloqueSeleccionado = nuevoBloque
                    }
                }
            )
        }

        // ── Bottom sheet nicho seleccionado (API) ─────────────────────────────
        nichoApiSeleccionado?.let { nicho ->
            NichoApiPopup(
                nicho     = nicho,
                onDismiss = { nichoApiSeleccionado = null },
                onRefresh = {
                    // Recargar nichos del bloque tras una operación
                    nichoApiSeleccionado = null
                    scope.launch {
                        bloqueSeleccionado?.id?.let { bid ->
                            CementerioRepository.getUnidades(bid).onSuccess { nichosApi = it }
                        }
                    }
                }
            )
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// VISTA DE BLOQUES CONECTADA A LA API
// ═══════════════════════════════════════════════════════════════════════════════
@Composable
fun BloquesApiView(
    bloques: List<BloqueResponse>,
    bloqueSeleccionado: BloqueResponse?,
    nichosApi: List<UnidadResponse>,
    cargandoBloques: Boolean,
    cargandoNichos: Boolean,
    scale: Float, offsetX: Float, offsetY: Float,
    onBloqueChange: (BloqueResponse) -> Unit,
    onNichoTap: (UnidadResponse) -> Unit,
    onScaleChange: (Float, Float, Float) -> Unit,
    onGenerarEstructura: (BloqueResponse) -> Unit = {},
    onCrearBloque: () -> Unit = {}
) {
    val cols = (bloqueSeleccionado?.columnas ?: 10).coerceAtMost(12)

    // Estadísticas calculadas sobre los nichos reales
    val libres    = nichosApi.count { it.estado?.uppercase() == "LIBRE" }
    val ocupados  = nichosApi.count { it.estado?.uppercase() == "OCUPADO" }
    val caducados = nichosApi.count { it.estado?.uppercase() == "CADUCADO" }

    Column(modifier = Modifier.fillMaxSize()) {
        // ── Selector de bloques (Horizontal) ──────────────────────────────────
        Box(modifier = Modifier.fillMaxWidth().background(SurfaceElevated).padding(vertical = 8.dp)) {
            if (cargandoBloques) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth(), color = GoldPrimary)
            } else {
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    items(bloques) { bloque ->
                        FilterChipCustom(
                            selected = bloque.id == bloqueSeleccionado?.id,
                            label = bloque.nombre,
                            onClick = { onBloqueChange(bloque) }
                        )
                    }
                    item {
                        IconButton(onClick = onCrearBloque) {
                            Icon(Icons.Default.AddCircle, "Nuevo Bloque", tint = GoldPrimary)
                        }
                    }
                }
            }
        }

        // ── Leyenda de estados ────────────────────────────────────────────────
        Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            listOf("OCUPADO" to NichoOcupado, "LIBRE" to NichoLibre,
                   "CADUCADO" to NichoCaducado, "RESERVADO" to NichoReservado,
                   "PENDIENTE" to NichoPendiente).forEach { (label, color) ->
                Row(verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                    Box(modifier = Modifier.size(8.dp).clip(RoundedCornerShape(2.dp)).background(color))
                    Text(label.lowercase().replaceFirstChar { it.uppercase() },
                        style = MaterialTheme.typography.labelSmall,
                        color = TextSecondary, fontSize = 9.sp)
                }
            }
        }

        // ── Stats en tiempo real ──────────────────────────────────────────────
        if (!cargandoNichos && nichosApi.isNotEmpty()) {
            Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp)
                .clip(RoundedCornerShape(10.dp)).background(SurfaceCard).padding(10.dp),
                horizontalArrangement = Arrangement.SpaceEvenly) {
                MiniStat("$ocupados",  "Ocup.",  NichoOcupado)
                MiniStat("$libres",    "Libres", NichoLibre)
                MiniStat("$caducados", "Cad.",   NichoCaducado)
                MiniStat("${nichosApi.size}", "Total", GoldPrimary)
            }
        }

        Spacer(Modifier.height(4.dp))

        // ── Grid de nichos con zoom/pan ───────────────────────────────────────
        Box(modifier = Modifier.fillMaxSize().background(SurfaceSunken)
            .pointerInput(Unit) {
                detectTransformGestures { _, pan, zoom, _ ->
                    val newScale = (scale * zoom).coerceIn(0.4f, 5f)
                    onScaleChange(newScale, offsetX + pan.x, offsetY + pan.y)
                }
            }
        ) {
            when {
                cargandoNichos -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        CircularProgressIndicator(color = GoldPrimary)
                        Text("Cargando nichos...", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                    }
                }
                nichosApi.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(Icons.Default.GridOff, null, tint = TextDisabled, modifier = Modifier.size(48.dp))
                        Text("Sin nichos en este bloque", color = TextSecondary,
                            style = MaterialTheme.typography.bodyMedium)
                        Text("Usa 'Generar estructura' en la API para crear los nichos",
                            color = TextDisabled, style = MaterialTheme.typography.bodySmall)
                    }
                }
                else -> Box(
                    modifier = Modifier.graphicsLayer(
                        scaleX = scale, scaleY = scale,
                        translationX = offsetX, translationY = offsetY
                    ).padding(16.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        val sorted = nichosApi.sortedWith(compareBy({ it.fila ?: 0 }, { it.numero ?: 0 }))
                        // Calcular número global para cada nicho: posición en la lista ordenada
                        sorted.mapIndexed { idx, nicho -> Pair(idx + 1, nicho) }
                              .chunked(cols).forEach { fila ->
                            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                fila.forEach { (numGlobal, nicho) ->
                                    NichoApiGridCell(
                                        nicho      = nicho,
                                        numGlobal  = numGlobal,
                                        onClick    = { onNichoTap(nicho) }
                                    )
                                }
                                repeat(cols - fila.size) {
                                    Box(modifier = Modifier.size(width = 36.dp, height = 52.dp))
                                }
                            }
                        }
                    }
                }
            }
            Text("Pellizca para zoom · Arrastra para mover · Toca un nicho para actuar",
                style = MaterialTheme.typography.labelSmall, color = TextDisabled,
                modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 8.dp))
        }
    }
}

// ── Celda individual del grid con datos reales ────────────────────────────────
@Composable
fun NichoApiGridCell(nicho: UnidadResponse, numGlobal: Int = 0, onClick: () -> Unit) {
    val estadoUp = nicho.estado?.uppercase() ?: "LIBRE"
    val color = when (estadoUp) {
        "OCUPADO"   -> NichoOcupado
        "LIBRE"     -> NichoLibre
        "CADUCADO"  -> NichoCaducado
        "RESERVADO" -> NichoReservado
        else        -> NichoPendiente
    }
    Box(
        modifier = Modifier
            .size(width = 36.dp, height = 52.dp)
            .clip(RoundedCornerShape(4.dp))
            .background(color.copy(alpha = 0.25f))
            .border(1.dp, color.copy(alpha = 0.8f), RoundedCornerShape(4.dp))
            .clickable { onClick() },
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(2.dp)) {
            // Mostrar número global (1, 2, 3... hasta total del bloque)
            Text(numGlobal.toString(), color = color, fontWeight = FontWeight.Bold, fontSize = 8.sp)
            if (estadoUp == "OCUPADO") {
                Box(modifier = Modifier.size(5.dp).clip(CircleShape).background(color))
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOTTOM SHEET al tocar un nicho en el grid — con acciones reales
// ═══════════════════════════════════════════════════════════════════════════════
@Composable
fun NichoApiPopup(
    nicho: UnidadResponse,
    onDismiss: () -> Unit,
    onRefresh: () -> Unit   // recarga el grid tras guardar
) {
    val estadoUp = nicho.estado?.uppercase() ?: "LIBRE"
    val color = when (estadoUp) {
        "OCUPADO"   -> NichoOcupado
        "LIBRE"     -> NichoLibre
        "CADUCADO"  -> NichoCaducado
        "RESERVADO" -> NichoReservado
        else        -> NichoPendiente
    }

    var mostrarInhumar    by remember { mutableStateOf(false) }
    var mostrarTrasladar  by remember { mutableStateOf(false) }

    Box(
        modifier = Modifier.fillMaxSize()
            .background(Color.Black.copy(alpha = 0.55f))
            .clickable { onDismiss() },
        contentAlignment = Alignment.BottomCenter
    ) {
        Column(
            modifier = Modifier.fillMaxWidth()
                .clip(RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp))
                .background(NavyMid)
                .border(BorderStroke(1.dp, color.copy(0.4f)),
                    RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp))
                .padding(24.dp)
                .clickable(enabled = false) {},
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Handle
            Box(modifier = Modifier.size(width = 40.dp, height = 4.dp)
                .clip(RoundedCornerShape(2.dp)).background(BorderSubtle)
                .align(Alignment.CenterHorizontally))

            // Cabecera
            Row(verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Box(modifier = Modifier.size(10.dp).clip(CircleShape).background(color))
                Text(nicho.codigo ?: "Nicho ${nicho.id}",
                    style = MaterialTheme.typography.titleLarge,
                    color = TextPrimary, fontWeight = FontWeight.Bold)
                Spacer(Modifier.weight(1f))
                // Chip de estado
                Box(modifier = Modifier
                    .clip(RoundedCornerShape(50))
                    .background(color.copy(0.2f))
                    .border(1.dp, color.copy(0.5f), RoundedCornerShape(50))
                    .padding(horizontal = 10.dp, vertical = 4.dp)) {
                    Text(nicho.estado?.lowercase()?.replaceFirstChar { it.uppercase() } ?: "—",
                        style = MaterialTheme.typography.labelSmall,
                        color = color, fontWeight = FontWeight.SemiBold)
                }
            }

            // Info básica
            Row(modifier = Modifier.fillMaxWidth()
                .clip(RoundedCornerShape(10.dp)).background(SurfaceCard).padding(12.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                InfoPill(Icons.Default.GridView,    "Fila ${nicho.fila ?: "—"}")
                InfoPill(Icons.Default.ViewColumn,  "Nº ${nicho.numero ?: "—"}")
                InfoPill(Icons.Default.Category,    nicho.tipo ?: "Nicho")
                nicho.id?.let { InfoPill(Icons.Default.Tag, "ID: $it") }
            }

            // ── Acciones según estado ─────────────────────────────────────────
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (estadoUp == "LIBRE" || estadoUp == "CADUCADO") {
                    // Nicho libre → puede inhumar
                    Button(
                        onClick = { mostrarInhumar = true },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = NichoOcupado, contentColor = Color.White)
                    ) {
                        Icon(Icons.Default.Add, null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Registrar Inhumación", fontWeight = FontWeight.Bold)
                    }
                }
                if (estadoUp == "OCUPADO") {
                    // Nicho ocupado → puede trasladar
                    Button(
                        onClick = { mostrarTrasladar = true },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = AlertAmber, contentColor = NavyDeep)
                    ) {
                        Icon(Icons.Default.SwapHoriz, null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Registrar Traslado", fontWeight = FontWeight.Bold)
                    }
                }
                OutlinedButton(
                    onClick = onDismiss,
                    modifier = Modifier.fillMaxWidth(),
                    border = BorderStroke(1.dp, BorderSubtle),
                    shape = RoundedCornerShape(12.dp)
                ) { Text("Cerrar", color = TextSecondary) }
            }

            Spacer(Modifier.height(6.dp))
        }
    }

    // Diálogos que se abren desde este popup
    if (mostrarInhumar) {
        DialogInhumarEnNicho(
            unidadId   = nicho.id ?: 0,
            codigoNicho = nicho.codigo ?: "Nicho ${nicho.id}",
            onDismiss  = { mostrarInhumar = false },
            onGuardado = { mostrarInhumar = false; onRefresh() }
        )
    }
    if (mostrarTrasladar) {
        DialogTrasladarDesdeNicho(
            unidadOrigenId  = nicho.id ?: 0,
            codigoNicho     = nicho.codigo ?: "Nicho ${nicho.id}",
            onDismiss       = { mostrarTrasladar = false },
            onGuardado      = { mostrarTrasladar = false; onRefresh() }
        )
    }
}

// ─── Componentes auxiliares que ya existían ───────────────────────────────────
// Vista OSMDroid (OpenStreetMap) — sin API Key, gratuito
@Composable
fun GoogleMapsView(onNichoApiClick: (Int) -> Unit = {}) {
    // Coordenadas del cementerio de Los Corrales de Buelna
    val lat = 43.2510
    val lon = -4.0580
    val context = androidx.compose.ui.platform.LocalContext.current
    val scope   = rememberCoroutineScope()

    // Configurar osmdroid
    androidx.compose.runtime.LaunchedEffect(Unit) {
        org.osmdroid.config.Configuration.getInstance().apply {
            load(context, context.getSharedPreferences("osmdroid", android.content.Context.MODE_PRIVATE))
            userAgentValue = "CementerioLosCorrrales/3.0"
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        AndroidView(
            factory = { ctx ->
                org.osmdroid.views.MapView(ctx).apply {
                    setTileSource(org.osmdroid.tileprovider.tilesource.TileSourceFactory.MAPNIK)
                    setMultiTouchControls(true)
                    controller.apply {
                        setZoom(17.0)
                        setCenter(org.osmdroid.util.GeoPoint(lat, lon))
                    }
                    // Marcador del cementerio
                    val marker = org.osmdroid.views.overlay.Marker(this)
                    marker.position = org.osmdroid.util.GeoPoint(lat, lon)
                    marker.setAnchor(org.osmdroid.views.overlay.Marker.ANCHOR_CENTER,
                                    org.osmdroid.views.overlay.Marker.ANCHOR_BOTTOM)
                    marker.title = "Cementerio Municipal"
                    marker.snippet = "Los Corrales de Buelna"
                    overlays.add(marker)
                }
            },
            modifier = Modifier.fillMaxSize()
        )

        // Leyenda
        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(start = 12.dp, bottom = 80.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(NavyDeep.copy(alpha = 0.85f))
                .padding(10.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text("OpenStreetMap", style = MaterialTheme.typography.labelSmall,
                color = GoldPrimary, fontWeight = FontWeight.Bold)
            Text("Sin API Key requerida", style = MaterialTheme.typography.labelSmall,
                color = TextSecondary)
        }
    }
}

@Composable
fun ZoomButton(text: String, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .size(32.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(SurfaceCard)
            .border(1.dp, BorderSubtle, RoundedCornerShape(8.dp))
            .clickable { onClick() },
        contentAlignment = Alignment.Center
    ) {
        Text(text, style = MaterialTheme.typography.titleMedium, color = GoldPrimary)
    }
}
