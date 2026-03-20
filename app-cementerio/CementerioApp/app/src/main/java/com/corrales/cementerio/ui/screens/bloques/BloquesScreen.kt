package com.corrales.cementerio.ui.screens.bloques

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.*
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
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.*
import com.corrales.cementerio.data.model.*
import com.corrales.cementerio.data.repository.CementerioRepository
import com.corrales.cementerio.ui.components.*
import com.corrales.cementerio.ui.theme.*
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter

// ─── Algoritmos de numeración ─────────────────────────────────────────────────
enum class SentidoNumeracion(val label: String, val descripcion: String) {
    HORIZONTAL_IZQ_DER("Horizontal →",    "Fila por fila, izquierda a derecha"),
    HORIZONTAL_DER_IZQ("Horizontal ←",    "Fila por fila, derecha a izquierda"),
    VERTICAL_ARR_ABA(  "Vertical ↓",      "Columna por columna, arriba abajo"),
    VERTICAL_ABA_ARR(  "Vertical ↑",      "Columna por columna, abajo arriba"),
    HORIZONTAL_ABA_ARR("Filas ↑ →",       "Empezando desde la fila inferior"),
}

/**
 * Calcula el número de nicho para una posición (fila, columna) según el sentido.
 * fila y columna son 0-indexed.
 */
fun calcularNumero(fila: Int, col: Int, filas: Int, columnas: Int, sentido: String): Int {
    return when (sentido.lowercase()) {
        "horizontal", "horizontal →" -> fila * columnas + col + 1
        "horizontal ←"              -> fila * columnas + (columnas - 1 - col) + 1
        "vertical ↓", "vertical"    -> col * filas + fila + 1
        "vertical ↑"                -> col * filas + (filas - 1 - fila) + 1
        "filas ↑ →"                 -> (filas - 1 - fila) * columnas + col + 1
        else                        -> fila * columnas + col + 1
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PANTALLA PRINCIPAL: VISTA DE BLOQUES
// ─────────────────────────────────────────────────────────────────────────────
@Composable
fun BloquesScreen(
    onNichoClick: (Int) -> Unit = {},
    onNavigate: (String) -> Unit = {}
) {
    val scope = rememberCoroutineScope()

    var cementerios        by remember { mutableStateOf<List<CementerioResponse>>(emptyList()) }
    var cemSeleccionado    by remember { mutableStateOf<CementerioResponse?>(null) }
    var bloques            by remember { mutableStateOf<List<BloqueResponse>>(emptyList()) }
    var bloqueSeleccionado by remember { mutableStateOf<BloqueResponse?>(null) }
    var unidades           by remember { mutableStateOf<List<UnidadResponse>>(emptyList()) }
    var cargando           by remember { mutableStateOf(true) }
    var cargandoNichos     by remember { mutableStateOf(false) }
    var mensajeToast       by remember { mutableStateOf("") }

    // Grid zoom/pan
    var scale   by remember { mutableFloatStateOf(1f) }
    var offsetX by remember { mutableFloatStateOf(0f) }
    var offsetY by remember { mutableFloatStateOf(0f) }

    // Diálogos
    var mostrarCrearBloque  by remember { mutableStateOf(false) }
    var nichoSeleccionado   by remember { mutableStateOf<UnidadResponse?>(null) }

    // Carga inicial
    LaunchedEffect(Unit) {
        CementerioRepository.getCementerios().onSuccess {
            cementerios = it
            cemSeleccionado = it.firstOrNull()
        }
        cargando = false
    }

    LaunchedEffect(cemSeleccionado) {
        val id = cemSeleccionado?.id ?: return@LaunchedEffect
        cargando = true
        CementerioRepository.getBloques(id).onSuccess {
            bloques = it
            bloqueSeleccionado = it.firstOrNull()
        }
        cargando = false
    }

    LaunchedEffect(bloqueSeleccionado) {
        val id = bloqueSeleccionado?.id ?: return@LaunchedEffect
        cargandoNichos = true
        scale = 1f; offsetX = 0f; offsetY = 0f
        CementerioRepository.getUnidades(id).onSuccess { unidades = it }
        cargandoNichos = false
    }

    fun recargarNichos() {
        scope.launch {
            bloqueSeleccionado?.id?.let { bid ->
                CementerioRepository.getUnidades(bid).onSuccess { unidades = it }
            }
        }
    }

    // Stats
    val libres    = unidades.count { it.estado?.uppercase() == "LIBRE" }
    val ocupados  = unidades.count { it.estado?.uppercase() == "OCUPADO" }
    val caducados = unidades.count { it.estado?.uppercase() == "CADUCADO" }

    CementerioBackground {
        Column(modifier = Modifier.fillMaxSize()) {

            // ── Cabecera ──────────────────────────────────────────────────────
            Box(modifier = Modifier.fillMaxWidth().background(NavyMid)
                .padding(horizontal = 20.dp, vertical = 14.dp)) {
                Row(modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween) {
                    Column {
                        Text("VISTA DE BLOQUES", style = MaterialTheme.typography.labelSmall,
                            color = GoldPrimary, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
                        val subtitle = when {
                            bloqueSeleccionado != null ->
                                "${bloqueSeleccionado!!.nombre} · ${unidades.size} nichos"
                            cargando -> "Cargando..."
                            else -> "Selecciona un bloque"
                        }
                        Text(subtitle, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        // Zoom controls (solo si hay nichos)
                        if (unidades.isNotEmpty()) {
                            ZoomControlRow(
                                onZoomIn  = { scale = (scale * 1.3f).coerceAtMost(5f) },
                                onZoomOut = { scale = (scale / 1.3f).coerceAtLeast(0.4f) },
                                onReset   = { scale = 1f; offsetX = 0f; offsetY = 0f }
                            )
                        }
                        // Botón nuevo bloque
                        IconButton(
                            onClick = { mostrarCrearBloque = true },
                            modifier = Modifier.clip(RoundedCornerShape(10.dp))
                                .background(GoldPrimary)
                        ) {
                            Icon(Icons.Default.Add, "Nuevo bloque", tint = NavyDeep)
                        }
                    }
                }
            }

            // ── Selector de cementerio (si hay más de 1) ──────────────────────
            if (cementerios.size > 1) {
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth().background(SurfaceElevated)
                ) {
                    items(cementerios, key = { it.id ?: it.hashCode() }) { cem ->
                        SelectorChip(
                            label    = cem.nombre,
                            selected = cem.id == cemSeleccionado?.id,
                            onClick  = { cemSeleccionado = cem },
                            color    = GoldPrimary
                        )
                    }
                }
            }

            // ── Selector de bloques ───────────────────────────────────────────
            if (bloques.isNotEmpty()) {
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth().background(SurfaceCard)
                ) {
                    items(bloques, key = { it.id ?: it.hashCode() }) { bloque ->
                        val filas = bloque.filas
                        val cols  = bloque.columnas
                        SelectorChip(
                            label       = bloque.nombre,
                            sublabel    = "${filas}×${cols}",
                            selected    = bloque.id == bloqueSeleccionado?.id,
                            onClick     = { bloqueSeleccionado = bloque },
                            color       = NichoOcupado
                        )
                    }
                }
            }

            // ── Barra stats ───────────────────────────────────────────────────
            AnimatedVisibility(visible = unidades.isNotEmpty() && !cargandoNichos) {
                Row(modifier = Modifier.fillMaxWidth().background(SurfaceSunken)
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceEvenly) {
                    MiniStat("$ocupados",         "Ocupados",  NichoOcupado)
                    MiniStat("$libres",           "Libres",    NichoLibre)
                    MiniStat("$caducados",        "Caducados", NichoCaducado)
                    MiniStat("${unidades.size}", "Total",     GoldPrimary)
                }
            }

            // ── Toast ─────────────────────────────────────────────────────────
            AnimatedVisibility(visible = mensajeToast.isNotBlank()) {
                val isError = mensajeToast.startsWith("✗")
                Row(modifier = Modifier.fillMaxWidth()
                    .background(if (isError) AlertRed.copy(.9f) else AlertGreen.copy(.9f))
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Icon(if (isError) Icons.Default.ErrorOutline else Icons.Default.CheckCircle,
                        null, tint = Color.White, modifier = Modifier.size(18.dp))
                    Text(mensajeToast, color = Color.White,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.weight(1f))
                    IconButton(onClick = { mensajeToast = "" }, modifier = Modifier.size(24.dp)) {
                        Icon(Icons.Default.Close, null, tint = Color.White, modifier = Modifier.size(16.dp))
                    }
                }
            }

            // ── Contenido principal ───────────────────────────────────────────
            Box(modifier = Modifier.fillMaxSize()) {
                when {
                    cargando || cargandoNichos -> {
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                CircularProgressIndicator(color = GoldPrimary)
                                Text(if (cargando) "Cargando bloques..." else "Cargando nichos...",
                                    style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                            }
                        }
                    }

                    bloqueSeleccionado == null -> {
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(14.dp),
                                modifier = Modifier.padding(32.dp)) {
                                Icon(Icons.Default.GridOff, null, tint = TextDisabled,
                                    modifier = Modifier.size(64.dp))
                                Text("Sin bloques creados",
                                    style = MaterialTheme.typography.titleMedium, color = TextSecondary)
                                Button(onClick = { mostrarCrearBloque = true },
                                    shape = RoundedCornerShape(12.dp),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = GoldPrimary, contentColor = NavyDeep)) {
                                    Icon(Icons.Default.Add, null, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(6.dp))
                                    Text("Crear primer bloque", fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }

                    unidades.isEmpty() -> {
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(12.dp),
                                modifier = Modifier.padding(32.dp)) {
                                Icon(Icons.Default.GridView, null, tint = TextDisabled,
                                    modifier = Modifier.size(64.dp))
                                Text("Bloque sin nichos",
                                    style = MaterialTheme.typography.titleMedium, color = TextSecondary)
                                Text("Pulsa 'Generar nichos' para crear la estructura",
                                    style = MaterialTheme.typography.bodySmall, color = TextDisabled,
                                    textAlign = TextAlign.Center)
                                Button(
                                    onClick = {
                                        scope.launch {
                                            bloqueSeleccionado?.id?.let { bid ->
                                                mensajeToast = ""
                                                CementerioRepository.generarEstructura(bid)
                                                    .onSuccess {
                                                        mensajeToast = "✓ Nichos generados"
                                                        recargarNichos()
                                                    }
                                                    .onFailure { mensajeToast = "✗ ${it.message}" }
                                            }
                                        }
                                    },
                                    shape = RoundedCornerShape(12.dp),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = NichoLibre, contentColor = NavyDeep)
                                ) {
                                    Icon(Icons.Default.GridOn, null, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(6.dp))
                                    Text("Generar nichos", fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }

                    else -> {
                        // ── Grid de nichos con zoom/pan ───────────────────────
                        NichosGridView(
                            unidades       = unidades,
                            bloque         = bloqueSeleccionado!!,
                            scale          = scale,
                            offsetX        = offsetX,
                            offsetY        = offsetY,
                            onNichoTap     = { nichoSeleccionado = it },
                            onScaleChange  = { s, ox, oy -> scale = s; offsetX = ox; offsetY = oy }
                        )
                    }
                }

                // ── Bottom sheet del nicho ────────────────────────────────────
                nichoSeleccionado?.let { nicho ->
                    NichoBottomSheet(
                        nicho       = nicho,
                        onDismiss   = { nichoSeleccionado = null },
                        onVerFicha  = { nichoSeleccionado = null; onNichoClick(nicho.id ?: 0) },
                        onRefresh   = { nichoSeleccionado = null; recargarNichos() }
                    )
                }
            }
        }

        // ── Diálogo crear bloque ──────────────────────────────────────────────
        if (mostrarCrearBloque) {
            DialogCrearBloqueNuevo(
                cementerioId = cemSeleccionado?.id ?: 1,
                onDismiss    = { mostrarCrearBloque = false },
                onCreado     = { nuevoBloque ->
                    mostrarCrearBloque = false
                    bloques = bloques + nuevoBloque
                    bloqueSeleccionado = nuevoBloque
                    mensajeToast = "✓ Bloque '${nuevoBloque.nombre}' creado"
                }
            )
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GRID DE NICHOS con numeración correcta
// ─────────────────────────────────────────────────────────────────────────────
@Composable
fun NichosGridView(
    unidades: List<UnidadResponse>,
    bloque: BloqueResponse,
    scale: Float, offsetX: Float, offsetY: Float,
    onNichoTap: (UnidadResponse) -> Unit,
    onScaleChange: (Float, Float, Float) -> Unit
) {
    val cols    = bloque.columnas.coerceAtLeast(1)
    val filas   = bloque.filas.coerceAtLeast(1)
    val sentido = bloque.sentidoNumeracion ?: "horizontal"

    // Ordenar unidades por su número real (fila, numero de la API)
    val sorted = unidades.sortedWith(compareBy({ it.fila ?: 0 }, { it.numero ?: 0 }))

    // Agrupar en filas de 'cols' elementos
    val filasList = sorted.chunked(cols)

    Box(modifier = Modifier
        .fillMaxSize()
        .background(SurfaceSunken)
        .pointerInput(Unit) {
            detectTransformGestures { _, pan, zoom, _ ->
                val newScale = (scale * zoom).coerceIn(0.4f, 5f)
                onScaleChange(newScale, offsetX + pan.x, offsetY + pan.y)
            }
        }
    ) {
        Box(modifier = Modifier
            .graphicsLayer(scaleX = scale, scaleY = scale,
                translationX = offsetX, translationY = offsetY)
            .padding(16.dp)
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                filasList.forEachIndexed { filaIdx, filaUnidades ->
                    Row(horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                        filaUnidades.forEach { unidad ->
                            NichoCelda(
                                unidad  = unidad,
                                numero  = unidad.numero
                                    ?: calcularNumero(
                                        fila     = unidad.fila ?: filaIdx,
                                        col      = (filaUnidades.indexOf(unidad)),
                                        filas    = filas,
                                        columnas = cols,
                                        sentido  = sentido
                                    ),
                                onClick = { onNichoTap(unidad) }
                            )
                        }
                        // Relleno si la fila está incompleta
                        repeat(cols - filaUnidades.size) {
                            Box(Modifier.size(width = 40.dp, height = 56.dp))
                        }
                    }
                }
            }
        }

        // Leyenda
        Row(modifier = Modifier
            .align(Alignment.BottomCenter)
            .padding(bottom = 8.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(NavyDeep.copy(.8f))
            .padding(horizontal = 12.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically) {
            listOf(
                "Ocupado"   to NichoOcupado,
                "Libre"     to NichoLibre,
                "Caducado"  to NichoCaducado,
                "Reservado" to NichoReservado,
            ).forEach { (label, color) ->
                Row(verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                    Box(Modifier.size(8.dp).clip(CircleShape).background(color))
                    Text(label, style = MaterialTheme.typography.labelSmall,
                        color = TextSecondary, fontSize = 9.sp)
                }
            }
            Text("· Toca un nicho", style = MaterialTheme.typography.labelSmall,
                color = TextDisabled, fontSize = 9.sp)
        }
    }
}

// ─── Celda individual de nicho ────────────────────────────────────────────────
@Composable
fun NichoCelda(unidad: UnidadResponse, numero: Int, onClick: () -> Unit) {
    val estadoUp = unidad.estado?.uppercase() ?: "LIBRE"
    val color = when (estadoUp) {
        "OCUPADO"   -> NichoOcupado
        "LIBRE"     -> NichoLibre
        "CADUCADO"  -> NichoCaducado
        "RESERVADO" -> NichoReservado
        else        -> NichoPendiente
    }
    Box(modifier = Modifier
        .size(width = 40.dp, height = 56.dp)
        .clip(RoundedCornerShape(4.dp))
        .background(color.copy(.2f))
        .border(1.dp, color.copy(.8f), RoundedCornerShape(4.dp))
        .clickable { onClick() },
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(
                text  = numero.toString(),
                color = color,
                fontWeight = FontWeight.Bold,
                fontSize = 9.sp
            )
            if (estadoUp == "OCUPADO") {
                Box(Modifier.size(5.dp).clip(CircleShape).background(color))
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// BOTTOM SHEET DEL NICHO — muestra restos, permite asignar huérfano o trasladar
// ─────────────────────────────────────────────────────────────────────────────
@Composable
fun NichoBottomSheet(
    nicho: UnidadResponse,
    onDismiss: () -> Unit,
    onVerFicha: () -> Unit,
    onRefresh: () -> Unit
) {
    val scope = rememberCoroutineScope()
    val estadoUp = nicho.estado?.uppercase() ?: "LIBRE"
    val color = when (estadoUp) {
        "OCUPADO"   -> NichoOcupado;  "LIBRE"     -> NichoLibre
        "CADUCADO"  -> NichoCaducado; "RESERVADO" -> NichoReservado
        else -> NichoPendiente
    }

    var restos           by remember { mutableStateOf<List<RestosResponse>>(emptyList()) }
    var huerfanos        by remember { mutableStateOf<List<RestosResponse>>(emptyList()) }
    var cargandoRestos   by remember { mutableStateOf(true) }
    var mostrarInhumar   by remember { mutableStateOf(false) }
    var mostrarTrasladar by remember { mutableStateOf(false) }
    var mostrarAsignar   by remember { mutableStateOf(false) }

    LaunchedEffect(nicho.id) {
        cargandoRestos = true
        nicho.id?.let { uid ->
            CementerioRepository.getRestosDeUnidad(uid).onSuccess { restos = it }
        }
        CementerioRepository.getRestosHuerfanos().onSuccess { huerfanos = it }
        cargandoRestos = false
    }

    Box(modifier = Modifier
        .fillMaxSize()
        .background(Color.Black.copy(.55f))
        .clickable { onDismiss() },
        contentAlignment = Alignment.BottomCenter
    ) {
        Column(modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp))
            .background(NavyMid)
            .border(BorderStroke(1.dp, color.copy(.4f)),
                RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp))
            .padding(20.dp)
            .clickable(enabled = false) {},
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Handle
            Box(Modifier.size(40.dp, 4.dp).clip(RoundedCornerShape(2.dp))
                .background(BorderSubtle).align(Alignment.CenterHorizontally))

            // Cabecera nicho
            Row(verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Box(Modifier.size(10.dp).clip(CircleShape).background(color))
                Text(nicho.codigo ?: "Nicho ${nicho.id}",
                    style = MaterialTheme.typography.titleLarge,
                    color = TextPrimary, fontWeight = FontWeight.Bold)
                Spacer(Modifier.weight(1f))
                Box(Modifier.clip(RoundedCornerShape(50))
                    .background(color.copy(.2f))
                    .border(1.dp, color.copy(.5f), RoundedCornerShape(50))
                    .padding(horizontal = 10.dp, vertical = 4.dp)) {
                    Text(nicho.estado?.lowercase()?.replaceFirstChar { it.uppercase() } ?: "—",
                        style = MaterialTheme.typography.labelSmall,
                        color = color, fontWeight = FontWeight.SemiBold)
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                InfoPillSmall(Icons.Default.GridView, "Fila ${nicho.fila ?: "—"}")
                InfoPillSmall(Icons.Default.ViewColumn, "Nº ${nicho.numero ?: "—"}")
                nicho.tipo?.let { InfoPillSmall(Icons.Default.Category, it) }
            }

            // ── Restos del nicho ──────────────────────────────────────────────
            if (cargandoRestos) {
                Row(verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    CircularProgressIndicator(Modifier.size(14.dp), color = GoldPrimary, strokeWidth = 2.dp)
                    Text("Cargando registros...", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                }
            } else if (restos.isNotEmpty()) {
                // Mostrar ficha resumida de los restos
                restos.forEach { r ->
                    Row(modifier = Modifier.fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(SurfaceCard)
                        .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Icon(Icons.Default.Person, null, tint = GoldPrimary, modifier = Modifier.size(20.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(r.nombreApellidos,
                                style = MaterialTheme.typography.bodyMedium,
                                color = TextPrimary, fontWeight = FontWeight.SemiBold)
                            Text("Inhumado: ${r.fechaInhumacion ?: "—"}",
                                style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                            r.procedencia?.let {
                                Text(it, style = MaterialTheme.typography.labelSmall, color = TextDisabled)
                            }
                        }
                    }
                }
            } else {
                Row(modifier = Modifier.fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .background(SurfaceCard)
                    .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.PersonOff, null, tint = TextDisabled, modifier = Modifier.size(18.dp))
                    Text("Sin restos registrados en este nicho",
                        style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                }
            }

            // ── Botones de acción según estado ────────────────────────────────
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                // Ver expediente completo — siempre disponible
                Button(onClick = onVerFicha,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = GoldPrimary, contentColor = NavyDeep)) {
                    Icon(Icons.Default.OpenInFull, null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Ver expediente completo", fontWeight = FontWeight.Bold)
                }

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (estadoUp == "LIBRE" || estadoUp == "CADUCADO") {
                        // Inhumar nuevo difunto
                        OutlinedButton(
                            onClick = { mostrarInhumar = true },
                            modifier = Modifier.weight(1f),
                            border = BorderStroke(1.dp, NichoOcupado),
                            shape = RoundedCornerShape(10.dp)) {
                            Icon(Icons.Default.Add, null, tint = NichoOcupado, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Inhumar", color = NichoOcupado, fontSize = 13.sp)
                        }
                        // Asignar huérfano
                        if (huerfanos.isNotEmpty()) {
                            OutlinedButton(
                                onClick = { mostrarAsignar = true },
                                modifier = Modifier.weight(1f),
                                border = BorderStroke(1.dp, NichoPendiente),
                                shape = RoundedCornerShape(10.dp)) {
                                Icon(Icons.Default.PersonSearch, null, tint = NichoPendiente, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(4.dp))
                                Text("Asignar", color = NichoPendiente, fontSize = 13.sp)
                            }
                        }
                    }
                    if (estadoUp == "OCUPADO" && restos.isNotEmpty()) {
                        OutlinedButton(
                            onClick = { mostrarTrasladar = true },
                            modifier = Modifier.weight(1f),
                            border = BorderStroke(1.dp, AlertAmber),
                            shape = RoundedCornerShape(10.dp)) {
                            Icon(Icons.Default.SwapHoriz, null, tint = AlertAmber, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Trasladar", color = AlertAmber, fontSize = 13.sp)
                        }
                    }
                }
            }
            Spacer(Modifier.height(4.dp))
        }
    }

    // ── Diálogos ─────────────────────────────────────────────────────────────
    if (mostrarInhumar) {
        com.corrales.cementerio.ui.screens.DialogInhumarEnNicho(
            unidadId    = nicho.id ?: 0,
            codigoNicho = nicho.codigo ?: "Nicho ${nicho.id}",
            onDismiss   = { mostrarInhumar = false },
            onGuardado  = { mostrarInhumar = false; onRefresh() }
        )
    }
    if (mostrarTrasladar) {
        com.corrales.cementerio.ui.screens.DialogTrasladarDesdeNicho(
            unidadOrigenId = nicho.id ?: 0,
            codigoNicho    = nicho.codigo ?: "Nicho ${nicho.id}",
            onDismiss      = { mostrarTrasladar = false },
            onGuardado     = { mostrarTrasladar = false; onRefresh() }
        )
    }
    if (mostrarAsignar) {
        DialogAsignarHuerfano(
            unidadId    = nicho.id ?: 0,
            codigoNicho = nicho.codigo ?: "Nicho ${nicho.id}",
            huerfanos   = huerfanos,
            onDismiss   = { mostrarAsignar = false },
            onGuardado  = { mostrarAsignar = false; onRefresh() }
        )
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// DIÁLOGO: Asignar un resto huérfano a un nicho libre
// ─────────────────────────────────────────────────────────────────────────────
@Composable
fun DialogAsignarHuerfano(
    unidadId: Int,
    codigoNicho: String,
    huerfanos: List<RestosResponse>,
    onDismiss: () -> Unit,
    onGuardado: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var seleccionado by remember { mutableStateOf<RestosResponse?>(null) }
    var isLoading    by remember { mutableStateOf(false) }
    var resultMsg    by remember { mutableStateOf("") }
    var isSuccess    by remember { mutableStateOf(false) }
    var query        by remember { mutableStateOf("") }

    val filtrados = huerfanos.filter {
        query.isBlank() || it.nombreApellidos.contains(query, ignoreCase = true)
    }

    AlertDialog(
        onDismissRequest = { if (!isLoading) onDismiss() },
        containerColor = NavyMid,
        icon = { Icon(Icons.Default.PersonSearch, null, tint = NichoPendiente, modifier = Modifier.size(32.dp)) },
        title = {
            Column {
                Text("Asignar registro sin ubicar", color = TextPrimary, fontWeight = FontWeight.Bold)
                Text("Nicho: $codigoNicho", style = MaterialTheme.typography.bodySmall, color = GoldPrimary)
            }
        },
        text = {
            Column(modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp)) {

                OutlinedTextField(value = query, onValueChange = { query = it },
                    placeholder = { Text("Buscar por nombre...", color = TextDisabled) },
                    leadingIcon = { Icon(Icons.Default.Search, null, tint = TextSecondary, modifier = Modifier.size(18.dp)) },
                    singleLine = true, shape = RoundedCornerShape(10.dp),
                    colors = com.corrales.cementerio.ui.components.cementerioFieldColors(),
                    modifier = Modifier.fillMaxWidth())

                if (filtrados.isEmpty()) {
                    Text("Sin registros que coincidan",
                        style = MaterialTheme.typography.bodySmall, color = TextDisabled)
                }

                filtrados.take(8).forEach { r ->
                    val sel = r.id == seleccionado?.id
                    Row(modifier = Modifier.fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(if (sel) NichoPendiente.copy(.2f) else SurfaceCard)
                        .border(1.dp, if (sel) NichoPendiente else BorderSubtle, RoundedCornerShape(10.dp))
                        .clickable { seleccionado = r }
                        .padding(10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Icon(if (sel) Icons.Default.CheckCircle else Icons.Default.RadioButtonUnchecked,
                            null, tint = if (sel) NichoPendiente else TextSecondary,
                            modifier = Modifier.size(18.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(r.nombreApellidos,
                                style = MaterialTheme.typography.labelLarge,
                                color = if (sel) NichoPendiente else TextPrimary,
                                fontWeight = if (sel) FontWeight.Bold else FontWeight.Normal)
                            Text(r.fechaInhumacion ?: "—",
                                style = MaterialTheme.typography.labelSmall, color = TextSecondary)
                        }
                    }
                }

                AnimatedVisibility(visible = resultMsg.isNotBlank()) {
                    Text(resultMsg, style = MaterialTheme.typography.bodySmall,
                        color = if (isSuccess) AlertGreen else AlertRed)
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val r = seleccionado ?: return@Button
                    isLoading = true
                    scope.launch {
                        CementerioRepository.vincularResto(r.id ?: 0, unidadId)
                            .onSuccess {
                                CementerioRepository.actualizarEstadoUnidad(unidadId, "Ocupado")
                                resultMsg = "✓ Asignado correctamente"; isSuccess = true
                            }
                            .onFailure { resultMsg = "✗ ${it.message}"; isSuccess = false }
                        isLoading = false
                    }
                },
                enabled = seleccionado != null && !isLoading && !isSuccess,
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = NichoPendiente, contentColor = Color.White)
            ) {
                if (isLoading) CircularProgressIndicator(Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                else Text("Asignar a este nicho", fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = { if (!isLoading) { if (isSuccess) onGuardado() else onDismiss() } }) {
                Text(if (isSuccess) "Cerrar" else "Cancelar", color = TextSecondary)
            }
        }
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// DIÁLOGO: Crear nuevo bloque con opciones de numeración
// ─────────────────────────────────────────────────────────────────────────────
@Composable
fun DialogCrearBloqueNuevo(
    cementerioId: Int,
    onDismiss: () -> Unit,
    onCreado: (BloqueResponse) -> Unit
) {
    val scope = rememberCoroutineScope()
    var nombre       by remember { mutableStateOf("") }
    var filas        by remember { mutableStateOf("10") }
    var columnas     by remember { mutableStateOf("10") }
    var sentido      by remember { mutableStateOf(SentidoNumeracion.HORIZONTAL_IZQ_DER) }
    var generarAuto  by remember { mutableStateOf(true) }
    var isLoading    by remember { mutableStateOf(false) }
    var errorMsg     by remember { mutableStateOf("") }
    var resultMsg    by remember { mutableStateOf("") }
    var isSuccess    by remember { mutableStateOf(false) }
    var bloqueCreado by remember { mutableStateOf<BloqueResponse?>(null) }

    val total = (filas.toIntOrNull() ?: 0) * (columnas.toIntOrNull() ?: 0)

    AlertDialog(
        onDismissRequest = { if (!isLoading) onDismiss() },
        containerColor = NavyMid,
        icon = { Icon(Icons.Default.AddBox, null, tint = GoldPrimary, modifier = Modifier.size(32.dp)) },
        title = { Text("Nuevo Bloque de Nichos", color = TextPrimary, fontWeight = FontWeight.Bold) },
        text = {
            Column(modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)) {

                // Nombre
                LabeledField("Nombre del bloque *") {
                    OutlinedTextField(value = nombre, onValueChange = { nombre = it; errorMsg = "" },
                        placeholder = { Text("Ej: Bloque Norte", color = TextDisabled) },
                        singleLine = true, shape = RoundedCornerShape(10.dp),
                        colors = com.corrales.cementerio.ui.components.cementerioFieldColors(),
                        modifier = Modifier.fillMaxWidth())
                }

                // Filas y columnas
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    LabeledField("Filas", modifier = Modifier.weight(1f)) {
                        OutlinedTextField(value = filas,
                            onValueChange = { if (it.length <= 3) filas = it.filter { c -> c.isDigit() } },
                            singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            shape = RoundedCornerShape(10.dp),
                            colors = com.corrales.cementerio.ui.components.cementerioFieldColors(),
                            modifier = Modifier.fillMaxWidth())
                    }
                    LabeledField("Columnas", modifier = Modifier.weight(1f)) {
                        OutlinedTextField(value = columnas,
                            onValueChange = { if (it.length <= 3) columnas = it.filter { c -> c.isDigit() } },
                            singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            shape = RoundedCornerShape(10.dp),
                            colors = com.corrales.cementerio.ui.components.cementerioFieldColors(),
                            modifier = Modifier.fillMaxWidth())
                    }
                }

                // Preview total
                if (total > 0) {
                    Row(modifier = Modifier.fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp)).background(GoldPrimary.copy(.1f))
                        .border(1.dp, GoldPrimary.copy(.3f), RoundedCornerShape(8.dp)).padding(10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(Icons.Default.GridView, null, tint = GoldPrimary, modifier = Modifier.size(18.dp))
                        Text("$total nichos  (${filas}×${columnas})",
                            style = MaterialTheme.typography.labelLarge,
                            color = GoldPrimary, fontWeight = FontWeight.Bold)
                    }
                }

                // Sentido de numeración
                LabeledField("Numeración de nichos") {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        SentidoNumeracion.values().forEach { s ->
                            val sel = sentido == s
                            Row(modifier = Modifier.fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .background(if (sel) GoldPrimary.copy(.15f) else SurfaceCard)
                                .border(1.dp, if (sel) GoldPrimary else BorderSubtle, RoundedCornerShape(8.dp))
                                .clickable { sentido = s }
                                .padding(horizontal = 12.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                Icon(if (sel) Icons.Default.RadioButtonChecked
                                     else Icons.Default.RadioButtonUnchecked,
                                    null, tint = if (sel) GoldPrimary else TextSecondary,
                                    modifier = Modifier.size(18.dp))
                                Column {
                                    Text(s.label, style = MaterialTheme.typography.labelLarge,
                                        color = if (sel) GoldPrimary else TextPrimary,
                                        fontWeight = if (sel) FontWeight.Bold else FontWeight.Normal)
                                    Text(s.descripcion, style = MaterialTheme.typography.labelSmall,
                                        color = TextSecondary)
                                }
                            }
                        }
                    }
                }

                // Toggle generar nichos
                Row(modifier = Modifier.fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .background(SurfaceCard)
                    .border(1.dp, if (generarAuto) AlertGreen.copy(.4f) else BorderSubtle, RoundedCornerShape(10.dp))
                    .padding(horizontal = 14.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Generar nichos automáticamente",
                            style = MaterialTheme.typography.labelLarge,
                            color = if (generarAuto) AlertGreen else TextPrimary,
                            fontWeight = if (generarAuto) FontWeight.Bold else FontWeight.Normal)
                        Text(if (generarAuto) "Se crearán $total nichos en estado Libre"
                             else "Solo se crea el bloque, sin nichos",
                            style = MaterialTheme.typography.labelSmall, color = TextSecondary)
                    }
                    Switch(checked = generarAuto, onCheckedChange = { generarAuto = it },
                        colors = SwitchDefaults.colors(checkedThumbColor = NavyDeep, checkedTrackColor = AlertGreen))
                }

                AnimatedVisibility(visible = errorMsg.isNotBlank()) {
                    Text(errorMsg, style = MaterialTheme.typography.labelSmall, color = AlertRed)
                }
                AnimatedVisibility(visible = resultMsg.isNotBlank()) {
                    Column(modifier = Modifier.fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(if (isSuccess) AlertGreen.copy(.1f) else AlertRed.copy(.1f))
                        .padding(10.dp), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                        resultMsg.split("\n").filter { it.isNotBlank() }.forEach { linea ->
                            Text(linea, style = MaterialTheme.typography.bodySmall,
                                color = if (linea.startsWith("✓")) AlertGreen
                                        else if (linea.startsWith("✗")) AlertRed
                                        else TextSecondary)
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (nombre.isBlank()) { errorMsg = "El nombre es obligatorio"; return@Button }
                    if ((filas.toIntOrNull() ?: 0) <= 0) { errorMsg = "Filas inválidas"; return@Button }
                    if ((columnas.toIntOrNull() ?: 0) <= 0) { errorMsg = "Columnas inválidas"; return@Button }
                    isLoading = true; errorMsg = ""; resultMsg = ""
                    scope.launch {
                        var res = ""
                        val bloqueReq = BloqueResponse(
                            cementerio = CementerioResponse(id = cementerioId),
                            nombre = nombre.trim(),
                            filas = filas.toInt(),
                            columnas = columnas.toInt(),
                            sentidoNumeracion = sentido.label
                        )
                        CementerioRepository.crearBloque(bloqueReq).onSuccess { nuevo ->
                            bloqueCreado = nuevo
                            res += "✓ Bloque '${nombre}' creado (ID: ${nuevo.id})\n"
                            if (generarAuto && nuevo.id != null) {
                                CementerioRepository.generarEstructura(nuevo.id)
                                    .onSuccess { res += "✓ ${filas.toInt() * columnas.toInt()} nichos generados en estado Libre" }
                                    .onFailure { res += "⚠ Nichos no generados: ${it.message}" }
                            }
                            isSuccess = true
                        }.onFailure {
                            res = "✗ ${it.message}"
                            isSuccess = false
                        }
                        resultMsg = res; isLoading = false
                    }
                },
                enabled = nombre.isNotBlank() && !isLoading && !isSuccess,
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = GoldPrimary, contentColor = NavyDeep)
            ) {
                if (isLoading) CircularProgressIndicator(Modifier.size(16.dp), color = NavyDeep, strokeWidth = 2.dp)
                else Text("Crear bloque", fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = { if (!isLoading) { if (isSuccess) bloqueCreado?.let { onCreado(it) } else onDismiss() } }) {
                Text(if (isSuccess) "Ver en pantalla" else "Cancelar", color = TextSecondary)
            }
        }
    )
}

// ─── Componentes auxiliares pequeños ─────────────────────────────────────────
@Composable
fun ZoomControlRow(onZoomIn: () -> Unit, onZoomOut: () -> Unit, onReset: () -> Unit) {
    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        listOf("+" to onZoomIn, "−" to onZoomOut, "⊙" to onReset).forEach { (label, action) ->
            Box(Modifier.size(32.dp).clip(RoundedCornerShape(8.dp))
                .background(SurfaceCard)
                .border(1.dp, BorderSubtle, RoundedCornerShape(8.dp))
                .clickable { action() }, contentAlignment = Alignment.Center) {
                Text(label, style = MaterialTheme.typography.titleMedium, color = GoldPrimary)
            }
        }
    }
}

@Composable
fun SelectorChip(
    label: String, selected: Boolean, onClick: () -> Unit,
    sublabel: String? = null, color: androidx.compose.ui.graphics.Color = GoldPrimary
) {
    Box(Modifier.clip(RoundedCornerShape(10.dp))
        .background(if (selected) color.copy(.2f) else SurfaceCard)
        .border(1.dp, if (selected) color else BorderSubtle, RoundedCornerShape(10.dp))
        .clickable { onClick() }
        .padding(horizontal = 14.dp, vertical = 8.dp)) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(label, style = MaterialTheme.typography.labelLarge,
                color = if (selected) color else TextPrimary,
                fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal)
            sublabel?.let {
                Text(it, style = MaterialTheme.typography.labelSmall, color = TextSecondary)
            }
        }
    }
}

@Composable
fun InfoPillSmall(icon: androidx.compose.ui.graphics.vector.ImageVector, text: String) {
    Row(Modifier.clip(RoundedCornerShape(6.dp)).background(SurfaceCard)
        .padding(horizontal = 8.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        Icon(icon, null, tint = TextSecondary, modifier = Modifier.size(12.dp))
        Text(text, style = MaterialTheme.typography.labelSmall, color = TextSecondary)
    }
}

@Composable
fun LabeledField(
    label: String,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit
) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(label, style = MaterialTheme.typography.labelLarge, color = TextSecondary)
        content()
    }
}
