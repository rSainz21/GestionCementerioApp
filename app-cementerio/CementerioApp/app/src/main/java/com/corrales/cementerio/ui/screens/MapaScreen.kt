package com.corrales.cementerio.ui.screens

import androidx.compose.foundation.*
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.unit.*
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.*
import com.corrales.cementerio.data.model.*
import com.corrales.cementerio.ui.components.*
import com.corrales.cementerio.ui.theme.*

// Coordenadas del cementerio municipal de Los Corrales de Buelna
private val CEMENTERIO_LATLNG = LatLng(43.2510, -4.0580)

@Composable
fun MapaScreen(onNichoClick: (UnidadEnterramiento) -> Unit = {}) {
    var vistaActiva by remember { mutableIntStateOf(0) } // 0=GoogleMaps, 1=Bloques
    var bloqueSeleccionado by remember { mutableStateOf(SampleData.bloques.first()) }
    var nichoSeleccionado  by remember { mutableStateOf<UnidadEnterramiento?>(null) }
    var scale   by remember { mutableFloatStateOf(1f) }
    var offsetX by remember { mutableFloatStateOf(0f) }
    var offsetY by remember { mutableFloatStateOf(0f) }

    LaunchedEffect(bloqueSeleccionado) { scale = 1f; offsetX = 0f; offsetY = 0f }

    val nichosGrid = remember(bloqueSeleccionado) {
        val total = bloqueSeleccionado.filas * bloqueSeleccionado.columnas
        (1..total).map { i ->
            val estado = when {
                i <= bloqueSeleccionado.caducados -> EstadoNicho.CADUCADO
                i <= bloqueSeleccionado.caducados + bloqueSeleccionado.ocupados -> EstadoNicho.OCUPADO
                i <= bloqueSeleccionado.caducados + bloqueSeleccionado.ocupados + bloqueSeleccionado.pendientes -> EstadoNicho.PENDIENTE
                else -> EstadoNicho.LIBRE
            }
            SampleData.unidades.find {
                it.bloque == bloqueSeleccionado.nombre &&
                (it.fila * bloqueSeleccionado.columnas + it.columna) == i
            } ?: UnidadEnterramiento(
                id = "${bloqueSeleccionado.id}-$i",
                codigo = "${bloqueSeleccionado.id}-N${i.toString().padStart(3, '0')}",
                bloque = bloqueSeleccionado.nombre,
                fila = (i - 1) / bloqueSeleccionado.columnas,
                columna = (i - 1) % bloqueSeleccionado.columnas,
                estado = estado
            )
        }
    }

    CementerioBackground {
        Column(modifier = Modifier.fillMaxSize()) {

            // ── Header ───────────────────────────────────────────────────────
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

            // ── Tabs Google Maps / Bloques ────────────────────────────────────
            TabRow(
                selectedTabIndex = vistaActiva,
                containerColor = SurfaceCard,
                contentColor = GoldPrimary,
                indicator = { tabPositions ->
                    TabRowDefaults.SecondaryIndicator(
                        modifier = Modifier.tabIndicatorOffset(tabPositions[vistaActiva]),
                        color = GoldPrimary
                    )
                }
            ) {
                listOf(
                    Pair(Icons.Default.Map,     "Mapa Satélite"),
                    Pair(Icons.Default.GridView,"Vista de Bloques")
                ).forEachIndexed { i, (icon, label) ->
                    Tab(
                        selected = vistaActiva == i,
                        onClick  = { vistaActiva = i },
                        icon = { Icon(icon, null, modifier = Modifier.size(18.dp)) },
                        text = {
                            Text(label,
                                color = if (vistaActiva == i) GoldPrimary else TextSecondary,
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = if (vistaActiva == i) FontWeight.Bold else FontWeight.Normal)
                        }
                    )
                }
            }

            // ── Contenido ────────────────────────────────────────────────────
            when (vistaActiva) {
                0 -> GoogleMapsView(onNichoClick = onNichoClick)
                1 -> BloquesView(
                    bloqueSeleccionado = bloqueSeleccionado,
                    nichosGrid = nichosGrid,
                    scale = scale, offsetX = offsetX, offsetY = offsetY,
                    onBloqueChange = { bloqueSeleccionado = it },
                    onNichoTap = { nichoSeleccionado = it },
                    onScaleChange = { s, ox, oy -> scale = s; offsetX = ox; offsetY = oy }
                )
            }
        }

        // Popup al tocar nicho en la vista de bloques
        nichoSeleccionado?.let { nicho ->
            NichoPopup(
                nicho = nicho,
                onDismiss = { nichoSeleccionado = null },
                onVerFicha = { nichoSeleccionado = null; onNichoClick(nicho) }
            )
        }
    }
}

// ── Vista Google Maps real ────────────────────────────────────────────────────
@Composable
fun GoogleMapsView(onNichoClick: (UnidadEnterramiento) -> Unit) {
    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(CEMENTERIO_LATLNG, 17f)
    }

    Box(modifier = Modifier.fillMaxSize()) {
        GoogleMap(
            modifier = Modifier.fillMaxSize(),
            cameraPositionState = cameraPositionState,
            properties = MapProperties(
                mapType = MapType.SATELLITE,
                isMyLocationEnabled = false
            ),
            uiSettings = MapUiSettings(
                zoomControlsEnabled = true,
                compassEnabled = true,
                myLocationButtonEnabled = false
            )
        ) {
            // Marcador principal del cementerio
            Marker(
                state = MarkerState(position = CEMENTERIO_LATLNG),
                title = "Cementerio Municipal",
                snippet = "Los Corrales de Buelna"
            )

            // Marcadores de nichos con coordenadas conocidas
            SampleData.unidades.filter { it.latitud != null }.forEach { unidad ->
                val pos = LatLng(unidad.latitud!!, unidad.longitud!!)
                val hue: Float = when (unidad.estado) {
                    EstadoNicho.OCUPADO   -> 210f
                    EstadoNicho.LIBRE     -> 120f
                    EstadoNicho.CADUCADO  -> 0f
                    EstadoNicho.RESERVADO -> 45f
                    EstadoNicho.PENDIENTE -> 280f
                }
                val markerIcon = com.google.android.gms.maps.model.BitmapDescriptorFactory
                    .defaultMarker(hue)
                Marker(
                    state = MarkerState(position = pos),
                    title = unidad.codigo,
                    snippet = unidad.difuntos.firstOrNull()
                        ?.let { d -> "${d.nombre} ${d.apellidos}" } ?: unidad.estado.label,
                    icon = markerIcon,
                    onClick = { onNichoClick(unidad); false }
                )
            }
        }

        // Leyenda superpuesta
        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(start = 12.dp, bottom = 110.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(NavyDeep.copy(alpha = 0.85f))
                .padding(10.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text("Leyenda", style = MaterialTheme.typography.labelSmall,
                color = GoldPrimary, fontWeight = FontWeight.Bold)
            listOf(
                EstadoNicho.OCUPADO, EstadoNicho.LIBRE,
                EstadoNicho.CADUCADO, EstadoNicho.RESERVADO
            ).forEach { estado ->
                Row(verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                    Box(modifier = Modifier.size(8.dp).clip(CircleShape)
                        .background(estadoColor(estado)))
                    Text(estado.label, style = MaterialTheme.typography.labelSmall,
                        color = TextSecondary)
                }
            }
        }

        // Aviso API key
        Box(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(top = 8.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(NavyDeep.copy(alpha = 0.9f))
                .padding(horizontal = 12.dp, vertical = 6.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Icon(Icons.Default.Info, null, tint = GoldPrimary, modifier = Modifier.size(14.dp))
                Text("Añade tu API Key en local.properties para ver el mapa",
                    style = MaterialTheme.typography.labelSmall, color = TextSecondary)
            }
        }
    }
}

// ── Vista de bloques interactiva ──────────────────────────────────────────────
@Composable
fun BloquesView(
    bloqueSeleccionado: BloqueNichos,
    nichosGrid: List<UnidadEnterramiento>,
    scale: Float, offsetX: Float, offsetY: Float,
    onBloqueChange: (BloqueNichos) -> Unit,
    onNichoTap: (UnidadEnterramiento) -> Unit,
    onScaleChange: (Float, Float, Float) -> Unit
) {
    val cols = bloqueSeleccionado.columnas.coerceAtMost(12)

    Column(modifier = Modifier.fillMaxSize()) {
        // Selector de bloques
        LazyRow(contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(SampleData.bloques) { bloque ->
                val sel = bloque == bloqueSeleccionado
                Box(
                    modifier = Modifier.clip(RoundedCornerShape(12.dp))
                        .background(if (sel) GoldPrimary.copy(alpha = 0.2f) else SurfaceCard)
                        .border(1.dp, if (sel) GoldPrimary else BorderSubtle, RoundedCornerShape(12.dp))
                        .clickable { onBloqueChange(bloque) }
                        .padding(horizontal = 14.dp, vertical = 8.dp)
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(bloque.nombre, style = MaterialTheme.typography.labelLarge,
                            color = if (sel) GoldPrimary else TextPrimary,
                            fontWeight = if (sel) FontWeight.Bold else FontWeight.Normal)
                        Text("${bloque.totalNichos} nichos",
                            style = MaterialTheme.typography.labelSmall, color = TextSecondary)
                    }
                }
            }
        }

        // Leyenda
        Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            listOf(EstadoNicho.OCUPADO, EstadoNicho.LIBRE, EstadoNicho.CADUCADO,
                EstadoNicho.RESERVADO, EstadoNicho.PENDIENTE).forEach { estado ->
                Row(verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                    Box(modifier = Modifier.size(8.dp).clip(RoundedCornerShape(2.dp))
                        .background(estadoColor(estado)))
                    Text(estado.label, style = MaterialTheme.typography.labelSmall,
                        color = TextSecondary, fontSize = 9.sp)
                }
            }
        }

        // Stats
        Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp)
            .clip(RoundedCornerShape(10.dp)).background(SurfaceCard).padding(10.dp),
            horizontalArrangement = Arrangement.SpaceEvenly) {
            MiniStat("${bloqueSeleccionado.ocupados}", "Ocup.", NichoOcupado)
            MiniStat("${bloqueSeleccionado.libres}",   "Libres", NichoLibre)
            MiniStat("${bloqueSeleccionado.caducados}","Cad.",   NichoCaducado)
            MiniStat("${bloqueSeleccionado.filas}×${bloqueSeleccionado.columnas}", "Grid", GoldPrimary)
        }

        Spacer(Modifier.height(4.dp))

        // Grid con zoom/pan
        Box(modifier = Modifier.fillMaxSize().background(SurfaceSunken)
            .pointerInput(Unit) {
                detectTransformGestures { _, pan, zoom, _ ->
                    val newScale = (scale * zoom).coerceIn(0.4f, 5f)
                    onScaleChange(newScale, offsetX + pan.x, offsetY + pan.y)
                }
            }
        ) {
            Box(modifier = Modifier.graphicsLayer(
                scaleX = scale, scaleY = scale,
                translationX = offsetX, translationY = offsetY
            ).padding(16.dp)) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    nichosGrid.chunked(cols).forEach { fila ->
                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            fila.forEach { nicho ->
                                NichoGridCell(nicho = nicho, onClick = { onNichoTap(nicho) })
                            }
                            repeat(cols - fila.size) {
                                Box(modifier = Modifier.size(width = 32.dp, height = 48.dp))
                            }
                        }
                    }
                }
            }
            Text("Pellizca para zoom · Arrastra para mover",
                style = MaterialTheme.typography.labelSmall, color = TextDisabled,
                modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 16.dp))
        }
    }
}

// ── Componentes compartidos ───────────────────────────────────────────────────
@Composable
fun ZoomButton(label: String, onClick: () -> Unit) {
    Box(modifier = Modifier.size(34.dp).clip(RoundedCornerShape(8.dp))
        .background(SurfaceCard).border(1.dp, BorderSubtle, RoundedCornerShape(8.dp))
        .clickable { onClick() }, contentAlignment = Alignment.Center) {
        Text(label, style = MaterialTheme.typography.titleMedium, color = GoldPrimary)
    }
}

@Composable
fun NichoGridCell(nicho: UnidadEnterramiento, onClick: () -> Unit) {
    val color = estadoColor(nicho.estado)
    Box(modifier = Modifier.size(width = 32.dp, height = 48.dp)
        .clip(RoundedCornerShape(4.dp))
        .background(color.copy(alpha = 0.3f))
        .border(1.dp, color.copy(alpha = 0.7f), RoundedCornerShape(4.dp))
        .clickable { onClick() },
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(2.dp)) {
            val num = nicho.codigo.filter { it.isDigit() }.takeLast(3).trimStart('0').ifBlank { "?" }
            Text(num, color = color, fontWeight = FontWeight.Bold, fontSize = 8.sp)
            if (nicho.difuntos.isNotEmpty())
                Box(modifier = Modifier.size(4.dp).clip(CircleShape).background(color))
        }
    }
}

@Composable
fun NichoPopup(
    nicho: UnidadEnterramiento,
    onDismiss: () -> Unit,
    onVerFicha: () -> Unit
) {
    val color = estadoColor(nicho.estado)
    Box(modifier = Modifier.fillMaxSize()
        .background(Color.Black.copy(alpha = 0.5f))
        .clickable { onDismiss() },
        contentAlignment = Alignment.BottomCenter
    ) {
        Column(
            modifier = Modifier.fillMaxWidth()
                .clip(RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp))
                .background(NavyMid)
                .border(BorderStroke(1.dp, color.copy(alpha = 0.4f)),
                    RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp))
                .padding(24.dp)
                .clickable(enabled = false) {},
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Box(modifier = Modifier.size(width = 40.dp, height = 4.dp)
                .clip(RoundedCornerShape(2.dp)).background(BorderSubtle)
                .align(Alignment.CenterHorizontally))

            Row(verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Box(modifier = Modifier.size(10.dp).clip(CircleShape).background(color))
                Text(nicho.codigo, style = MaterialTheme.typography.titleLarge,
                    color = TextPrimary, fontWeight = FontWeight.Bold)
                Spacer(Modifier.weight(1f))
                EstadoChip(nicho.estado)
            }

            Text(nicho.bloque, style = MaterialTheme.typography.bodyMedium, color = TextSecondary)

            nicho.difuntos.firstOrNull()?.let { d ->
                Row(modifier = Modifier.fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp)).background(SurfaceCard).padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Icon(Icons.Default.Person, null, tint = GoldPrimary, modifier = Modifier.size(18.dp))
                    Column {
                        Text("${d.nombre} ${d.apellidos}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextPrimary, fontWeight = FontWeight.SemiBold)
                        Text("† ${d.fechaDefuncion}",
                            style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                    }
                }
            }

            nicho.concesion?.let { c ->
                Row(modifier = Modifier.fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp)).background(SurfaceCard).padding(10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.Badge, null, tint = TextSecondary, modifier = Modifier.size(16.dp))
                    Text("${c.titular.nombre} ${c.titular.apellidos}",
                        style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                    Spacer(Modifier.weight(1f))
                    Text("Vence ${c.fechaVencimiento.year}",
                        style = MaterialTheme.typography.labelSmall, color = AlertAmber)
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedButton(onClick = onDismiss, modifier = Modifier.weight(1f),
                    border = BorderStroke(1.dp, BorderSubtle),
                    shape = RoundedCornerShape(12.dp)) {
                    Text("Cerrar", color = TextSecondary)
                }
                Button(onClick = onVerFicha, modifier = Modifier.weight(2f),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = GoldPrimary, contentColor = NavyDeep)) {
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
