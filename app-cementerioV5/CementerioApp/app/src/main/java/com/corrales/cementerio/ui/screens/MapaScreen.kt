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
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.*
import com.corrales.cementerio.data.model.*
import com.corrales.cementerio.data.repository.CementerioRepository
import com.corrales.cementerio.ui.components.*
import com.corrales.cementerio.ui.theme.*
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
fun MapaScreen(onNichoClick: (UnidadEnterramiento) -> Unit = {}) {
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
                0 -> GoogleMapsView(onNichoClick = onNichoClick)
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

        if (cargandoBloques) {
            Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = GoldPrimary, modifier = Modifier.size(24.dp))
            }
        }

        // ── Selector de bloques ───────────────────────────────────────────────
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(bloques) { bloque ->
                val sel = bloque.id == bloqueSeleccionado?.id
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(if (sel) GoldPrimary.copy(0.2f) else SurfaceCard)
                        .border(1.dp, if (sel) GoldPrimary else BorderSubtle, RoundedCornerShape(12.dp))
                        .clickable { onBloqueChange(bloque) }
                        .padding(horizontal = 14.dp, vertical = 8.dp)
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(bloque.nombre,
                            style = MaterialTheme.typography.labelLarge,
                            color = if (sel) GoldPrimary else TextPrimary,
                            fontWeight = if (sel) FontWeight.Bold else FontWeight.Normal)
                        Text("${bloque.filas}×${bloque.columnas}",
                            style = MaterialTheme.typography.labelSmall, color = TextSecondary)
                    }
                }
            }
        }

        // ── Fila de acciones rápidas del bloque ──────────────────────────────
        if (bloqueSeleccionado != null) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Botón generar estructura (solo si el bloque no tiene nichos)
                Button(
                    onClick = { bloqueSeleccionado?.let { onGenerarEstructura(it) } },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (nichosApi.isEmpty()) GoldPrimary else SurfaceCard,
                        contentColor   = if (nichosApi.isEmpty()) NavyDeep else TextSecondary
                    ),
                    border = if (nichosApi.isNotEmpty()) BorderStroke(1.dp, BorderSubtle) else null,
                    enabled = !cargandoNichos
                ) {
                    if (cargandoNichos) {
                        CircularProgressIndicator(modifier = Modifier.size(14.dp),
                            color = if (nichosApi.isEmpty()) NavyDeep else TextSecondary, strokeWidth = 2.dp)
                    } else {
                        Icon(Icons.Default.GridOn, null, modifier = Modifier.size(15.dp))
                        Spacer(Modifier.width(4.dp))
                        Text(
                            if (nichosApi.isEmpty()) "Generar nichos" else "Regenerar",
                            style = MaterialTheme.typography.labelLarge
                        )
                    }
                }
                // Botón nuevo bloque
                OutlinedButton(
                    onClick = onCrearBloque,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(10.dp),
                    border = BorderStroke(1.dp, GoldPrimary.copy(0.6f))
                ) {
                    Icon(Icons.Default.AddBox, null, tint = GoldPrimary, modifier = Modifier.size(15.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Nuevo bloque", style = MaterialTheme.typography.labelLarge, color = GoldPrimary)
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
                        // Ordenar por fila y número para que el grid sea correcto
                        val sorted = nichosApi.sortedWith(compareBy({ it.fila ?: 0 }, { it.numero ?: 0 }))
                        sorted.chunked(cols).forEach { fila ->
                            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                fila.forEach { nicho ->
                                    NichoApiGridCell(nicho = nicho, onClick = { onNichoTap(nicho) })
                                }
                                // Rellenar huecos al final de fila
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
fun NichoApiGridCell(nicho: UnidadResponse, onClick: () -> Unit) {
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
            val num = (nicho.numero ?: 0).toString().padStart(3, '0').trimStart('0').ifBlank { "?" }
            Text(num, color = color, fontWeight = FontWeight.Bold, fontSize = 8.sp)
            // Punto si está ocupado
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

// ═══════════════════════════════════════════════════════════════════════════════
// DIÁLOGO — REGISTRAR INHUMACIÓN EN UN NICHO LIBRE
// Flujo: POST /api/restos  →  PUT /api/restos/{id}/vincular/{unidadId}
//         →  PUT /api/unidades/{id} estado=Ocupado
//         →  POST /api/movimientos  tipoMovimiento="Inhumación"
// ═══════════════════════════════════════════════════════════════════════════════
@Composable
fun DialogInhumarEnNicho(
    unidadId: Int,
    codigoNicho: String,
    onDismiss: () -> Unit,
    onGuardado: () -> Unit
) {
    val scope = rememberCoroutineScope()
    val fmt   = DateTimeFormatter.ofPattern("yyyy-MM-dd")
    val fmtD  = DateTimeFormatter.ofPattern("dd/MM/yyyy")

    var nombre        by remember { mutableStateOf("") }
    var apellidos     by remember { mutableStateOf("") }
    var fechaInhum    by remember { mutableStateOf("") }
    var procedencia   by remember { mutableStateOf("") }
    var notas         by remember { mutableStateOf("") }
    var isLoading     by remember { mutableStateOf(false) }
    var pasoMsg       by remember { mutableStateOf("") }
    var errorMsg      by remember { mutableStateOf("") }
    var resultMsg     by remember { mutableStateOf("") }
    var isSuccess     by remember { mutableStateOf(false) }

    val valido = nombre.isNotBlank() && apellidos.isNotBlank()

    AlertDialog(
        onDismissRequest = { if (!isLoading) onDismiss() },
        containerColor = NavyMid,
        icon = { Icon(Icons.Default.Add, null, tint = NichoOcupado, modifier = Modifier.size(32.dp)) },
        title = {
            Column {
                Text("Registrar Inhumación", color = TextPrimary, fontWeight = FontWeight.Bold)
                Text("Nicho: $codigoNicho", style = MaterialTheme.typography.bodySmall, color = GoldPrimary)
            }
        },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Nombre y apellidos
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("Nombre *", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                        OutlinedTextField(value = nombre, onValueChange = { nombre = it; errorMsg = "" },
                            placeholder = { Text("Nombre", color = TextDisabled) }, singleLine = true,
                            shape = RoundedCornerShape(10.dp), colors = cementerioFieldColors(),
                            modifier = Modifier.fillMaxWidth())
                    }
                    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("Apellidos *", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                        OutlinedTextField(value = apellidos, onValueChange = { apellidos = it; errorMsg = "" },
                            placeholder = { Text("Apellidos", color = TextDisabled) }, singleLine = true,
                            shape = RoundedCornerShape(10.dp), colors = cementerioFieldColors(),
                            modifier = Modifier.fillMaxWidth())
                    }
                }
                // Fecha
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Fecha inhumación", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                    OutlinedTextField(value = fechaInhum, onValueChange = { fechaInhum = it },
                        placeholder = { Text("DD/MM/AAAA  (vacío = hoy)", color = TextDisabled) },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        shape = RoundedCornerShape(10.dp), colors = cementerioFieldColors(),
                        modifier = Modifier.fillMaxWidth())
                }
                // Procedencia
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Procedencia", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                    OutlinedTextField(value = procedencia, onValueChange = { procedencia = it },
                        placeholder = { Text("Hospital, domicilio, traslado...", color = TextDisabled) },
                        singleLine = true, shape = RoundedCornerShape(10.dp),
                        colors = cementerioFieldColors(), modifier = Modifier.fillMaxWidth())
                }
                // Notas
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Notas históricas", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                    OutlinedTextField(value = notas, onValueChange = { notas = it },
                        placeholder = { Text("Anotaciones del libro, tachaduras...", color = TextDisabled) },
                        minLines = 2, shape = RoundedCornerShape(10.dp),
                        colors = cementerioFieldColors(), modifier = Modifier.fillMaxWidth())
                }
                // Progreso
                AnimatedVisibility(visible = pasoMsg.isNotBlank()) {
                    Row(modifier = Modifier.fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp)).background(GoldPrimary.copy(0.1f)).padding(10.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically) {
                        CircularProgressIndicator(modifier = Modifier.size(14.dp), color = GoldPrimary, strokeWidth = 2.dp)
                        Text(pasoMsg, style = MaterialTheme.typography.bodySmall, color = GoldPrimary)
                    }
                }
                // Resultado
                AnimatedVisibility(visible = resultMsg.isNotBlank()) {
                    Column(modifier = Modifier.fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(if (isSuccess) AlertGreen.copy(0.1f) else AlertRed.copy(0.1f))
                        .padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        resultMsg.split("\n").forEach { linea ->
                            if (linea.isNotBlank()) {
                                val c = when { linea.startsWith("✓") -> AlertGreen; linea.startsWith("✗") -> AlertRed; else -> TextSecondary }
                                Text(linea, style = MaterialTheme.typography.bodySmall, color = c)
                            }
                        }
                    }
                }
                if (errorMsg.isNotBlank()) {
                    Text(errorMsg, style = MaterialTheme.typography.labelSmall, color = AlertRed)
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (!valido) { errorMsg = "Nombre y apellidos son obligatorios"; return@Button }
                    isLoading = true; errorMsg = ""; resultMsg = ""
                    scope.launch {
                        val fechaParsed = if (fechaInhum.isNotBlank()) {
                            try {
                                if (fechaInhum.contains("/")) LocalDate.parse(fechaInhum, fmtD).format(fmt)
                                else fechaInhum
                            } catch (e: Exception) { LocalDate.now().format(fmt) }
                        } else LocalDate.now().format(fmt)

                        var resumen = ""

                        // PASO 1: Crear registro de restos
                        pasoMsg = "Registrando difunto..."
                        val restosResult = CementerioRepository.crearResto(RestosRequest(
                            nombreApellidos = "$nombre $apellidos".trim(),
                            fechaInhumacion = fechaParsed,
                            procedencia     = procedencia.ifBlank { null },
                            notasHistoricas = notas.ifBlank { null }
                        ))
                        restosResult.onFailure {
                            resumen += "✗ Error al crear difunto: ${it.message}\n"
                            resultMsg = resumen.trim(); isSuccess = false; isLoading = false; pasoMsg = ""; return@launch
                        }
                        val restoId = restosResult.getOrNull()?.id ?: run {
                            resultMsg = "✗ No se obtuvo ID del difunto"; isSuccess = false; isLoading = false; pasoMsg = ""; return@launch
                        }
                        resumen += "✓ Difunto registrado (ID: $restoId)\n"

                        // PASO 2: Vincular al nicho
                        pasoMsg = "Vinculando al nicho..."
                        CementerioRepository.vincularResto(restoId, unidadId)
                            .onSuccess { resumen += "✓ Vinculado al nicho $codigoNicho\n" }
                            .onFailure { resumen += "⚠ No se pudo vincular: ${it.message}\n" }

                        // PASO 3: Cambiar estado del nicho a Ocupado
                        pasoMsg = "Actualizando estado del nicho..."
                        CementerioRepository.actualizarEstadoUnidad(unidadId, "Ocupado")
                            .onSuccess { resumen += "✓ Estado del nicho → Ocupado\n" }
                            .onFailure { resumen += "⚠ No se pudo actualizar estado: ${it.message}\n" }

                        // PASO 4: Registrar movimiento de Inhumación
                        pasoMsg = "Registrando movimiento..."
                        CementerioRepository.registrarMovimiento(MovimientoRequest(
                            resto           = IdWrapper(restoId),
                            tipoMovimiento  = "Inhumación",
                            fechaMovimiento = fechaParsed,
                            destino         = IdWrapper(unidadId),
                            notas           = "Inhumación en $codigoNicho"
                        )).onSuccess { resumen += "✓ Movimiento de Inhumación registrado\n" }
                          .onFailure { resumen += "⚠ No se pudo registrar movimiento: ${it.message}\n" }

                        pasoMsg = ""
                        resultMsg = resumen.trim()
                        isSuccess = true
                        isLoading = false
                    }
                },
                enabled = valido && !isLoading && !isSuccess,
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = NichoOcupado, contentColor = Color.White)
            ) {
                if (isLoading) CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                else { Icon(Icons.Default.Save, null, modifier = Modifier.size(16.dp)); Spacer(Modifier.width(4.dp)); Text("Inhumar", fontWeight = FontWeight.Bold) }
            }
        },
        dismissButton = {
            TextButton(onClick = {
                if (!isLoading) { if (isSuccess) onGuardado() else onDismiss() }
            }) { Text(if (isSuccess) "Cerrar y actualizar" else "Cancelar", color = TextSecondary) }
        }
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIÁLOGO — REGISTRAR TRASLADO DESDE UN NICHO OCUPADO
// Flujo: buscar restos del nicho  →  POST /api/movimientos tipoMovimiento="Traslado"
//         →  PUT /api/restos/{id}/vincular/{destinoId}
//         →  PUT /api/unidades/{origen} estado=Libre
//         →  PUT /api/unidades/{destino} estado=Ocupado
// ═══════════════════════════════════════════════════════════════════════════════
@Composable
fun DialogTrasladarDesdeNicho(
    unidadOrigenId: Int,
    codigoNicho: String,
    onDismiss: () -> Unit,
    onGuardado: () -> Unit
) {
    val scope = rememberCoroutineScope()
    val fmt   = DateTimeFormatter.ofPattern("yyyy-MM-dd")

    var destinoId     by remember { mutableStateOf("") }
    var restoIdInput  by remember { mutableStateOf("") }
    var tipoTraslado  by remember { mutableStateOf("Traslado") }
    var notas         by remember { mutableStateOf("") }
    var isLoading     by remember { mutableStateOf(false) }
    var pasoMsg       by remember { mutableStateOf("") }
    var errorMsg      by remember { mutableStateOf("") }
    var resultMsg     by remember { mutableStateOf("") }
    var isSuccess     by remember { mutableStateOf(false) }

    val tiposTraslado = listOf("Traslado", "Exhumación", "Reducción de restos")

    AlertDialog(
        onDismissRequest = { if (!isLoading) onDismiss() },
        containerColor = NavyMid,
        icon = { Icon(Icons.Default.SwapHoriz, null, tint = AlertAmber, modifier = Modifier.size(32.dp)) },
        title = {
            Column {
                Text("Registrar Traslado", color = TextPrimary, fontWeight = FontWeight.Bold)
                Text("Origen: $codigoNicho", style = MaterialTheme.typography.bodySmall, color = AlertAmber)
            }
        },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Tipo de traslado
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("Tipo de operación", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                    tiposTraslado.forEach { tipo ->
                        val sel = tipoTraslado == tipo
                        Row(modifier = Modifier.fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (sel) AlertAmber.copy(0.15f) else SurfaceCard)
                            .border(1.dp, if (sel) AlertAmber else BorderSubtle, RoundedCornerShape(8.dp))
                            .clickable { tipoTraslado = tipo }
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            Icon(if (sel) Icons.Default.RadioButtonChecked else Icons.Default.RadioButtonUnchecked,
                                null, tint = if (sel) AlertAmber else TextSecondary, modifier = Modifier.size(18.dp))
                            Text(tipo, style = MaterialTheme.typography.labelLarge,
                                color = if (sel) AlertAmber else TextPrimary,
                                fontWeight = if (sel) FontWeight.Bold else FontWeight.Normal)
                        }
                    }
                }

                // ID del resto a trasladar
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("ID del difunto/resto", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                    OutlinedTextField(value = restoIdInput,
                        onValueChange = { restoIdInput = it.filter { c -> c.isDigit() }; errorMsg = "" },
                        placeholder = { Text("ID del registro de restos en BD", color = TextDisabled) },
                        leadingIcon = { Icon(Icons.Default.Person, null, tint = AlertAmber, modifier = Modifier.size(18.dp)) },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        shape = RoundedCornerShape(10.dp), colors = cementerioFieldColors(),
                        modifier = Modifier.fillMaxWidth())
                    Text("Encuéntralo en el expediente del nicho o en Regularización",
                        style = MaterialTheme.typography.labelSmall, color = TextDisabled)
                }

                // ID del nicho destino (solo para Traslado)
                AnimatedVisibility(visible = tipoTraslado == "Traslado" || tipoTraslado == "Reducción de restos") {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("ID del nicho destino", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                        OutlinedTextField(value = destinoId,
                            onValueChange = { destinoId = it.filter { c -> c.isDigit() }; errorMsg = "" },
                            placeholder = { Text("ID del nicho de destino", color = TextDisabled) },
                            leadingIcon = { Icon(Icons.Default.GridView, null, tint = NichoLibre, modifier = Modifier.size(18.dp)) },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            shape = RoundedCornerShape(10.dp), colors = cementerioFieldColors(),
                            modifier = Modifier.fillMaxWidth())
                    }
                }

                // Notas
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Notas del traslado", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                    OutlinedTextField(value = notas, onValueChange = { notas = it },
                        placeholder = { Text("Motivo del traslado, autorización...", color = TextDisabled) },
                        minLines = 2, shape = RoundedCornerShape(10.dp),
                        colors = cementerioFieldColors(), modifier = Modifier.fillMaxWidth())
                }

                // Progreso
                AnimatedVisibility(visible = pasoMsg.isNotBlank()) {
                    Row(modifier = Modifier.fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp)).background(AlertAmber.copy(0.1f)).padding(10.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically) {
                        CircularProgressIndicator(modifier = Modifier.size(14.dp), color = AlertAmber, strokeWidth = 2.dp)
                        Text(pasoMsg, style = MaterialTheme.typography.bodySmall, color = AlertAmber)
                    }
                }
                // Resultado
                AnimatedVisibility(visible = resultMsg.isNotBlank()) {
                    Column(modifier = Modifier.fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(if (isSuccess) AlertGreen.copy(0.1f) else AlertRed.copy(0.1f))
                        .padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        resultMsg.split("\n").forEach { linea ->
                            if (linea.isNotBlank()) {
                                val c = when { linea.startsWith("✓") -> AlertGreen; linea.startsWith("✗") -> AlertRed; else -> TextSecondary }
                                Text(linea, style = MaterialTheme.typography.bodySmall, color = c)
                            }
                        }
                    }
                }
                if (errorMsg.isNotBlank()) Text(errorMsg, style = MaterialTheme.typography.labelSmall, color = AlertRed)
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val restoId = restoIdInput.toIntOrNull()
                    if (restoId == null) { errorMsg = "Introduce el ID del difunto"; return@Button }
                    if ((tipoTraslado == "Traslado" || tipoTraslado == "Reducción de restos") && destinoId.toIntOrNull() == null) {
                        errorMsg = "Introduce el ID del nicho destino"; return@Button
                    }
                    val destino = destinoId.toIntOrNull()
                    isLoading = true; errorMsg = ""; resultMsg = ""

                    scope.launch {
                        val hoy = LocalDate.now().format(fmt)
                        var resumen = ""

                        // PASO 1: Registrar movimiento
                        pasoMsg = "Registrando movimiento..."
                        CementerioRepository.registrarMovimiento(MovimientoRequest(
                            resto           = IdWrapper(restoId),
                            tipoMovimiento  = tipoTraslado,
                            fechaMovimiento = hoy,
                            origen          = IdWrapper(unidadOrigenId),
                            destino         = destino?.let { IdWrapper(it) },
                            notas           = notas.ifBlank { "$tipoTraslado desde $codigoNicho" }
                        )).onSuccess { resumen += "✓ Movimiento '$tipoTraslado' registrado\n" }
                          .onFailure { resumen += "✗ Error al registrar movimiento: ${it.message}\n"; resultMsg = resumen.trim(); isSuccess = false; isLoading = false; pasoMsg = ""; return@launch }

                        // PASO 2: Vincular resto al nuevo nicho (si hay destino)
                        if (destino != null) {
                            pasoMsg = "Vinculando resto al nicho destino..."
                            CementerioRepository.vincularResto(restoId, destino)
                                .onSuccess { resumen += "✓ Resto vinculado al nicho destino #$destino\n" }
                                .onFailure { resumen += "⚠ No se pudo vincular al destino: ${it.message}\n" }

                            // PASO 3: Nicho destino → Ocupado
                            pasoMsg = "Actualizando estado nicho destino..."
                            CementerioRepository.actualizarEstadoUnidad(destino, "Ocupado")
                                .onSuccess { resumen += "✓ Nicho destino → Ocupado\n" }
                                .onFailure { resumen += "⚠ No se actualizó estado destino\n" }
                        }

                        // PASO 4: Nicho origen → Libre
                        pasoMsg = "Liberando nicho de origen..."
                        val nuevoEstadoOrigen = if (tipoTraslado == "Exhumación") "Libre" else "Libre"
                        CementerioRepository.actualizarEstadoUnidad(unidadOrigenId, nuevoEstadoOrigen)
                            .onSuccess { resumen += "✓ Nicho origen ($codigoNicho) → Libre\n" }
                            .onFailure { resumen += "⚠ No se actualizó estado del origen\n" }

                        pasoMsg = ""
                        resultMsg = resumen.trim()
                        isSuccess = true
                        isLoading = false
                    }
                },
                enabled = restoIdInput.isNotBlank() && !isLoading && !isSuccess,
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = AlertAmber, contentColor = NavyDeep)
            ) {
                if (isLoading) CircularProgressIndicator(modifier = Modifier.size(16.dp), color = NavyDeep, strokeWidth = 2.dp)
                else { Icon(Icons.Default.SwapHoriz, null, modifier = Modifier.size(16.dp)); Spacer(Modifier.width(4.dp)); Text("Confirmar traslado", fontWeight = FontWeight.Bold) }
            }
        },
        dismissButton = {
            TextButton(onClick = { if (!isLoading) { if (isSuccess) onGuardado() else onDismiss() } }) {
                Text(if (isSuccess) "Cerrar y actualizar" else "Cancelar", color = TextSecondary)
            }
        }
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIÁLOGO — CREAR NUEVO BLOQUE
// POST /api/bloques  →  (opcional) POST /api/unidades/generar-estructura/{id}
// ═══════════════════════════════════════════════════════════════════════════════
@Composable
fun DialogCrearBloque(
    cementerioId: Int,
    onDismiss: () -> Unit,
    onCreado: (BloqueResponse) -> Unit
) {
    val scope = rememberCoroutineScope()

    var nombre          by remember { mutableStateOf("") }
    var filas           by remember { mutableStateOf("10") }
    var columnas        by remember { mutableStateOf("10") }
    var sentido         by remember { mutableStateOf("horizontal") }
    var generarAuto     by remember { mutableStateOf(true) }
    var isLoading       by remember { mutableStateOf(false) }
    var errorMsg        by remember { mutableStateOf("") }
    var resultMsg       by remember { mutableStateOf("") }
    var isSuccess       by remember { mutableStateOf(false) }
    var bloqueCreado    by remember { mutableStateOf<BloqueResponse?>(null) }

    val totalNichos = (filas.toIntOrNull() ?: 0) * (columnas.toIntOrNull() ?: 0)

    AlertDialog(
        onDismissRequest = { if (!isLoading) onDismiss() },
        containerColor = NavyMid,
        icon = { Icon(Icons.Default.AddBox, null, tint = GoldPrimary, modifier = Modifier.size(32.dp)) },
        title = { Text("Nuevo Bloque de Nichos", color = TextPrimary, fontWeight = FontWeight.Bold) },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {

                // Nombre del bloque
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Nombre del bloque *", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                    OutlinedTextField(
                        value = nombre,
                        onValueChange = { nombre = it; errorMsg = "" },
                        placeholder = { Text("Ej: Bloque Norte, Bloque San José...", color = TextDisabled) },
                        singleLine = true,
                        shape = RoundedCornerShape(10.dp),
                        colors = cementerioFieldColors(),
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                // Filas y columnas
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("Filas", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                        OutlinedTextField(
                            value = filas,
                            onValueChange = { if (it.length <= 3) filas = it.filter { c -> c.isDigit() } },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            shape = RoundedCornerShape(10.dp),
                            colors = cementerioFieldColors(),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("Columnas", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                        OutlinedTextField(
                            value = columnas,
                            onValueChange = { if (it.length <= 3) columnas = it.filter { c -> c.isDigit() } },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            shape = RoundedCornerShape(10.dp),
                            colors = cementerioFieldColors(),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }

                // Vista previa del total
                if (totalNichos > 0) {
                    Row(
                        modifier = Modifier.fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(GoldPrimary.copy(0.1f))
                            .border(1.dp, GoldPrimary.copy(0.3f), RoundedCornerShape(8.dp))
                            .padding(10.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.GridView, null, tint = GoldPrimary, modifier = Modifier.size(18.dp))
                        Column {
                            Text("$totalNichos nichos en total",
                                style = MaterialTheme.typography.labelLarge,
                                color = GoldPrimary, fontWeight = FontWeight.Bold)
                            Text("${filas.ifBlank{"0"}} filas × ${columnas.ifBlank{"0"}} columnas",
                                style = MaterialTheme.typography.labelSmall, color = TextSecondary)
                        }
                    }
                }

                // Sentido de numeración
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("Sentido de numeración", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                    listOf(
                        Pair("horizontal", "De izquierda a derecha, fila por fila"),
                        Pair("vertical",   "De arriba a abajo, columna por columna")
                    ).forEach { (valor, desc) ->
                        val sel = sentido == valor
                        Row(
                            modifier = Modifier.fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .background(if (sel) GoldPrimary.copy(0.15f) else SurfaceCard)
                                .border(1.dp, if (sel) GoldPrimary else BorderSubtle, RoundedCornerShape(8.dp))
                                .clickable { sentido = valor }
                                .padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Icon(
                                if (sel) Icons.Default.RadioButtonChecked else Icons.Default.RadioButtonUnchecked,
                                null, tint = if (sel) GoldPrimary else TextSecondary,
                                modifier = Modifier.size(18.dp)
                            )
                            Column(modifier = Modifier.weight(1f)) {
                                Text(valor.replaceFirstChar { it.uppercase() },
                                    style = MaterialTheme.typography.labelLarge,
                                    color = if (sel) GoldPrimary else TextPrimary,
                                    fontWeight = if (sel) FontWeight.Bold else FontWeight.Normal)
                                Text(desc, style = MaterialTheme.typography.labelSmall, color = TextSecondary)
                            }
                        }
                    }
                }

                // Toggle generar nichos automáticamente
                Row(
                    modifier = Modifier.fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(SurfaceCard)
                        .border(1.dp, if (generarAuto) AlertGreen.copy(0.4f) else BorderSubtle, RoundedCornerShape(10.dp))
                        .padding(horizontal = 14.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Generar nichos automáticamente",
                            style = MaterialTheme.typography.labelLarge,
                            color = if (generarAuto) AlertGreen else TextPrimary,
                            fontWeight = if (generarAuto) FontWeight.Bold else FontWeight.Normal)
                        Text(
                            if (generarAuto) "Se crearán $totalNichos nichos en estado Libre"
                            else "Solo se crea el bloque, sin nichos",
                            style = MaterialTheme.typography.labelSmall, color = TextSecondary
                        )
                    }
                    Switch(
                        checked = generarAuto,
                        onCheckedChange = { generarAuto = it },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = NavyDeep,
                            checkedTrackColor = AlertGreen
                        )
                    )
                }

                // Progreso
                AnimatedVisibility(visible = isLoading) {
                    Row(
                        modifier = Modifier.fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(GoldPrimary.copy(0.1f)).padding(10.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(14.dp), color = GoldPrimary, strokeWidth = 2.dp)
                        Text("Procesando...", style = MaterialTheme.typography.bodySmall, color = GoldPrimary)
                    }
                }

                // Resultado
                AnimatedVisibility(visible = resultMsg.isNotBlank()) {
                    Column(
                        modifier = Modifier.fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (isSuccess) AlertGreen.copy(0.1f) else AlertRed.copy(0.1f))
                            .padding(10.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        resultMsg.split("\n").forEach { linea ->
                            if (linea.isNotBlank()) {
                                val c = when {
                                    linea.startsWith("✓") -> AlertGreen
                                    linea.startsWith("✗") -> AlertRed
                                    else -> TextSecondary
                                }
                                Text(linea, style = MaterialTheme.typography.bodySmall, color = c)
                            }
                        }
                    }
                }

                if (errorMsg.isNotBlank()) {
                    Text(errorMsg, style = MaterialTheme.typography.labelSmall, color = AlertRed)
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (nombre.isBlank()) { errorMsg = "El nombre es obligatorio"; return@Button }
                    if ((filas.toIntOrNull() ?: 0) <= 0) { errorMsg = "Introduce un número de filas válido"; return@Button }
                    if ((columnas.toIntOrNull() ?: 0) <= 0) { errorMsg = "Introduce un número de columnas válido"; return@Button }

                    isLoading = true; errorMsg = ""; resultMsg = ""
                    scope.launch {
                        var resumen = ""

                        // PASO 1: Crear el bloque
                        val bloqueRequest = BloqueResponse(
                            cementerio       = CementerioResponse(id = cementerioId),
                            nombre           = nombre.trim(),
                            filas            = filas.toInt(),
                            columnas         = columnas.toInt(),
                            sentidoNumeracion = sentido
                        )
                        val bloqueResult = CementerioRepository.crearBloque(bloqueRequest)

                        bloqueResult.onFailure {
                            resultMsg = "✗ Error al crear bloque: ${it.message}"
                            isSuccess = false; isLoading = false; return@launch
                        }

                        val nuevoBloque = bloqueResult.getOrNull()!!
                        bloqueCreado = nuevoBloque
                        resumen += "✓ Bloque '${nombre}' creado (ID: ${nuevoBloque.id})\n"

                        // PASO 2: Generar estructura si está activado
                        if (generarAuto && nuevoBloque.id != null) {
                            CementerioRepository.generarEstructura(nuevoBloque.id)
                                .onSuccess {
                                    resumen += "✓ ${filas.toInt() * columnas.toInt()} nichos generados en estado Libre\n"
                                    resumen += "✓ Listo para usar en la vista de bloques"
                                }
                                .onFailure {
                                    resumen += "⚠ Bloque creado pero no se generaron los nichos: ${it.message}\n"
                                    resumen += "  Usa el botón 'Generar nichos' en la vista de bloques"
                                }
                        } else {
                            resumen += "✓ Bloque creado sin nichos\n"
                            resumen += "  Usa el botón 'Generar nichos' para crearlos"
                        }

                        resultMsg = resumen.trim()
                        isSuccess = true
                        isLoading = false
                    }
                },
                enabled = nombre.isNotBlank() && !isLoading && !isSuccess,
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = GoldPrimary, contentColor = NavyDeep)
            ) {
                if (isLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), color = NavyDeep, strokeWidth = 2.dp)
                } else {
                    Icon(Icons.Default.Save, null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Crear bloque", fontWeight = FontWeight.Bold)
                }
            }
        },
        dismissButton = {
            TextButton(onClick = {
                if (!isLoading) {
                    if (isSuccess) bloqueCreado?.let { onCreado(it) } else onDismiss()
                }
            }) {
                Text(if (isSuccess) "Ver en mapa" else "Cancelar", color = TextSecondary)
            }
        }
    )
}


// ─── Componentes auxiliares que ya existían ───────────────────────────────────
@Composable
fun GoogleMapsView(onNichoClick: (UnidadEnterramiento) -> Unit) {
    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(CEMENTERIO_LATLNG, 17f)
    }
    Box(modifier = Modifier.fillMaxSize()) {
        GoogleMap(
            modifier = Modifier.fillMaxSize(),
            cameraPositionState = cameraPositionState,
            properties = MapProperties(mapType = MapType.SATELLITE, isMyLocationEnabled = false),
            uiSettings = MapUiSettings(zoomControlsEnabled = true, compassEnabled = true, myLocationButtonEnabled = false)
        ) {
            Marker(state = MarkerState(position = CEMENTERIO_LATLNG),
                title = "Cementerio Municipal", snippet = "Los Corrales de Buelna")
            SampleData.unidades.filter { it.latitud != null }.forEach { unidad ->
                val pos = LatLng(unidad.latitud!!, unidad.longitud!!)
                val hue: Float = when (unidad.estado) {
                    EstadoNicho.OCUPADO -> 210f; EstadoNicho.LIBRE -> 120f
                    EstadoNicho.CADUCADO -> 0f; EstadoNicho.RESERVADO -> 45f; EstadoNicho.PENDIENTE -> 280f
                }
                Marker(state = MarkerState(position = pos), title = unidad.codigo,
                    snippet = unidad.difuntos.firstOrNull()?.let { "${it.nombre} ${it.apellidos}" } ?: unidad.estado.label,
                    icon = com.google.android.gms.maps.model.BitmapDescriptorFactory.defaultMarker(hue),
                    onClick = { onNichoClick(unidad); false })
            }
        }
        Column(modifier = Modifier.align(Alignment.BottomStart).padding(start = 12.dp, bottom = 110.dp)
            .clip(RoundedCornerShape(10.dp)).background(NavyDeep.copy(alpha = 0.85f)).padding(10.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text("Leyenda", style = MaterialTheme.typography.labelSmall, color = GoldPrimary, fontWeight = FontWeight.Bold)
            listOf(EstadoNicho.OCUPADO, EstadoNicho.LIBRE, EstadoNicho.CADUCADO, EstadoNicho.RESERVADO).forEach { estado ->
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                    Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(estadoColor(estado)))
                    Text(estado.label, style = MaterialTheme.typography.labelSmall, color = TextSecondary)
                }
            }
        }
        Box(modifier = Modifier.align(Alignment.TopCenter).padding(top = 8.dp)
            .clip(RoundedCornerShape(8.dp)).background(NavyDeep.copy(alpha = 0.9f))
            .padding(horizontal = 12.dp, vertical = 6.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Icon(Icons.Default.Info, null, tint = GoldPrimary, modifier = Modifier.size(14.dp))
                Text("Añade tu API Key en local.properties para ver el mapa",
                    style = MaterialTheme.typography.labelSmall, color = TextSecondary)
            }
        }
    }
}

@Composable fun ZoomButton(label: String, onClick: () -> Unit) {
    Box(modifier = Modifier.size(34.dp).clip(RoundedCornerShape(8.dp))
        .background(SurfaceCard).border(1.dp, BorderSubtle, RoundedCornerShape(8.dp))
        .clickable { onClick() }, contentAlignment = Alignment.Center) {
        Text(label, style = MaterialTheme.typography.titleMedium, color = GoldPrimary)
    }
}

// NichoPopup para la vista Google Maps (sample data) - sin cambios
@Composable
fun NichoPopup(nicho: UnidadEnterramiento, onDismiss: () -> Unit, onVerFicha: () -> Unit) {
    val color = estadoColor(nicho.estado)
    Box(modifier = Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.5f)).clickable { onDismiss() },
        contentAlignment = Alignment.BottomCenter) {
        Column(modifier = Modifier.fillMaxWidth()
            .clip(RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp)).background(NavyMid)
            .border(BorderStroke(1.dp, color.copy(alpha = 0.4f)), RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp))
            .padding(24.dp).clickable(enabled = false) {},
            verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Box(modifier = Modifier.size(width = 40.dp, height = 4.dp).clip(RoundedCornerShape(2.dp))
                .background(BorderSubtle).align(Alignment.CenterHorizontally))
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Box(modifier = Modifier.size(10.dp).clip(CircleShape).background(color))
                Text(nicho.codigo, style = MaterialTheme.typography.titleLarge, color = TextPrimary, fontWeight = FontWeight.Bold)
                Spacer(Modifier.weight(1f))
                EstadoChip(nicho.estado)
            }
            Text(nicho.bloque, style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
            nicho.difuntos.firstOrNull()?.let { d ->
                Row(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(SurfaceCard).padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Icon(Icons.Default.Person, null, tint = GoldPrimary, modifier = Modifier.size(18.dp))
                    Column {
                        Text("${d.nombre} ${d.apellidos}", style = MaterialTheme.typography.bodyMedium, color = TextPrimary, fontWeight = FontWeight.SemiBold)
                        Text("† ${d.fechaDefuncion}", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                    }
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedButton(onClick = onDismiss, modifier = Modifier.weight(1f),
                    border = BorderStroke(1.dp, BorderSubtle), shape = RoundedCornerShape(12.dp)) {
                    Text("Cerrar", color = TextSecondary)
                }
                Button(onClick = onVerFicha, modifier = Modifier.weight(2f), shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = GoldPrimary, contentColor = NavyDeep)) {
                    Icon(Icons.Default.OpenInFull, null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Ver expediente", fontWeight = FontWeight.Bold)
                }
            }
            Spacer(Modifier.height(6.dp))
        }
    }
}

fun estadoColor(estado: EstadoNicho): Color = when (estado) {
    EstadoNicho.OCUPADO   -> NichoOcupado
    EstadoNicho.LIBRE     -> NichoLibre
    EstadoNicho.CADUCADO  -> NichoCaducado
    EstadoNicho.RESERVADO -> NichoReservado
    EstadoNicho.PENDIENTE -> NichoPendiente
}
