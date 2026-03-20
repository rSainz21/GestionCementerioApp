package com.corrales.cementerio.ui.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.draw.*
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.*
import com.corrales.cementerio.data.model.*
import com.corrales.cementerio.data.repository.CementerioRepository
import com.corrales.cementerio.data.repository.SessionManager
import com.corrales.cementerio.ui.components.*
import com.corrales.cementerio.ui.theme.*
import kotlinx.coroutines.launch

data class Accion(val label: String, val icon: ImageVector, val ruta: String, val color: Color)

@Composable
fun DashboardApiScreen(
    onNavigate: (String) -> Unit = {},
    onLogout: () -> Unit = {}
) {
    val scope = rememberCoroutineScope()
    var alertas   by remember { mutableStateOf<List<ConcesionResponse>>(emptyList()) }
    var impagos   by remember { mutableStateOf<List<TasaResponse>>(emptyList()) }
    var bloques   by remember { mutableStateOf<List<BloqueResponse>>(emptyList()) }
    var huerfanos by remember { mutableStateOf(0) }
    var isLoading by remember { mutableStateOf(true) }

    // Para la animación de contadores
    var animStarted by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        scope.launch {
            CementerioRepository.getAlertasCaducidad(6).onSuccess  { alertas   = it }
            CementerioRepository.getTasasImpagadas().onSuccess      { impagos   = it }
            CementerioRepository.getRestosHuerfanos().onSuccess     { huerfanos = it.size }
            CementerioRepository.getCementerios().onSuccess { cems ->
                cems.firstOrNull()?.id?.let { cid ->
                    CementerioRepository.getBloques(cid).onSuccess { bloques = it }
                }
            }
            isLoading = false
            animStarted = true
        }
    }

    val acciones = listOf(
        Accion("Nueva inhumación",   Icons.Default.Add,              "nuevo_nicho",      GoldPrimary),
        Accion("Verificar nicho",    Icons.Default.FactCheck,        "verificar",        NichoOcupado),
        Accion("Trabajo de campo",   Icons.Default.DirectionsWalk,   "campo",            AlertAmber),
        Accion("Regularización",     Icons.Default.AssignmentLate,   "regularizacion",   NichoPendiente),
        Accion("Cobros / Tasas",     Icons.Default.Payment,          "tasas_economicas", NichoCaducado),
        Accion("Portal ciudadano",   Icons.Default.People,           "portal_ciudadano", NichoLibre),
        Accion("Estadísticas",       Icons.Default.Analytics,        "estadisticas",     NichoReservado),
        Accion("Exportar PDF",       Icons.Default.PictureAsPdf,     "exportar_pdf",     AlertRed),
        Accion("Generar QR",         Icons.Default.QrCode,           "generar_qr",       GoldPrimary),
        Accion("Búsqueda global",    Icons.Default.ManageSearch,     "busqueda_global",  NichoOcupado),
        Accion("Ver mapa",           Icons.Default.Map,              "mapa",             NichoLibre),
        Accion("Ver alertas",        Icons.Default.Notifications,    "alertas",          AlertRed),
    )

    CementerioBackground {
        LazyColumn(modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 100.dp)) {

            // ── Header con gradiente ──────────────────────────────────────────
            item {
                Box(modifier = Modifier.fillMaxWidth()
                    .background(Brush.verticalGradient(listOf(NavyMid, NavyDeep)))) {
                    Column(modifier = Modifier.fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 24.dp)) {
                        Row(modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween) {
                            Column {
                                Text("AYUNTAMIENTO", style = MaterialTheme.typography.labelSmall,
                                    color = GoldPrimary, fontWeight = FontWeight.Bold, letterSpacing = 3.sp)
                                Text("Los Corrales de Buelna",
                                    style = MaterialTheme.typography.headlineSmall,
                                    color = TextPrimary, fontWeight = FontWeight.Bold)
                                Text("Gestión de Cementerios · ${SessionManager.getUsername()}",
                                    style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                            }
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                // Búsqueda
                                Box(modifier = Modifier.size(46.dp).clip(CircleShape)
                                    .background(GoldPrimary.copy(0.12f))
                                    .border(2.dp, GoldPrimary.copy(0.5f), CircleShape)
                                    .clickable { onNavigate("busqueda_global") },
                                    contentAlignment = Alignment.Center) {
                                    Icon(Icons.Default.Search, null, tint = GoldPrimary,
                                        modifier = Modifier.size(20.dp))
                                }
                                // Logout
                                Box(modifier = Modifier.size(46.dp).clip(CircleShape)
                                    .background(GoldPrimary.copy(0.12f))
                                    .border(2.dp, GoldPrimary.copy(0.5f), CircleShape)
                                    .clickable { onLogout() },
                                    contentAlignment = Alignment.Center) {
                                    Icon(Icons.Default.Logout, null, tint = AlertRed,
                                        modifier = Modifier.size(20.dp))
                                }
                            }
                        }
                    }
                }
            }

            // ── KPIs animados ─────────────────────────────────────────────────
            item {
                Row(modifier = Modifier.fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 14.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    KpiCardAnimado(
                        valor  = if (isLoading) "—" else "${impagos.size}",
                        label  = "Impagos",
                        icon   = Icons.Default.MoneyOff,
                        color  = AlertRed,
                        delay  = 0,
                        started = animStarted,
                        onClick = { onNavigate("tasas_economicas") },
                        modifier = Modifier.weight(1f)
                    )
                    KpiCardAnimado(
                        valor  = if (isLoading) "—" else "${alertas.size}",
                        label  = "Vencimientos",
                        icon   = Icons.Default.Schedule,
                        color  = AlertAmber,
                        delay  = 150,
                        started = animStarted,
                        onClick = { onNavigate("alertas") },
                        modifier = Modifier.weight(1f)
                    )
                    KpiCardAnimado(
                        valor  = if (isLoading) "—" else "$huerfanos",
                        label  = "Sin ubicar",
                        icon   = Icons.Default.PersonSearch,
                        color  = NichoPendiente,
                        delay  = 300,
                        started = animStarted,
                        onClick = { onNavigate("regularizacion") },
                        modifier = Modifier.weight(1f)
                    )
                    KpiCardAnimado(
                        valor  = if (isLoading) "—" else "${bloques.size}",
                        label  = "Bloques",
                        icon   = Icons.Default.GridView,
                        color  = GoldPrimary,
                        delay  = 450,
                        started = animStarted,
                        onClick = { onNavigate("mapa") },
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            // ── Acceso rápido al portal ciudadano — DESTACADO ─────────────────
            item {
                Column(modifier = Modifier.fillMaxWidth()
                    .padding(horizontal = 16.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(Brush.horizontalGradient(
                        listOf(NichoLibre.copy(0.2f), NichoOcupado.copy(0.15f))))
                    .border(1.dp, NichoLibre.copy(0.5f), RoundedCornerShape(16.dp))
                    .clickable { onNavigate("portal_ciudadano") }
                    .padding(18.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                        Box(modifier = Modifier.size(52.dp).clip(CircleShape)
                            .background(NichoLibre.copy(0.2f)),
                            contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.People, null, tint = NichoLibre,
                                modifier = Modifier.size(28.dp))
                        }
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Portal Ciudadano", style = MaterialTheme.typography.titleMedium,
                                color = TextPrimary, fontWeight = FontWeight.Bold)
                            Text("Cualquier vecino puede buscar a su familiar",
                                style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                        }
                        Icon(Icons.Default.ArrowForwardIos, null, tint = NichoLibre,
                            modifier = Modifier.size(18.dp))
                    }
                }
                Spacer(Modifier.height(14.dp))
            }

            // ── Título acciones ───────────────────────────────────────────────
            item {
                SectionHeader("Acciones rápidas")
            }

            // ── Grid de acciones 3 columnas ───────────────────────────────────
            item {
                val rows = acciones.chunked(3)
                Column(modifier = Modifier.padding(horizontal = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    rows.forEachIndexed { rowIdx, row ->
                        Row(modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            row.forEachIndexed { colIdx, accion ->
                                AccionCard(
                                    accion   = accion,
                                    delay    = (rowIdx * 3 + colIdx) * 50,
                                    started  = animStarted,
                                    onClick  = { onNavigate(accion.ruta) },
                                    modifier = Modifier.weight(1f)
                                )
                            }
                            // Rellenar huecos si la fila es incompleta
                            repeat(3 - row.size) { Spacer(Modifier.weight(1f)) }
                        }
                    }
                }
            }

            // ── Alertas críticas ──────────────────────────────────────────────
            if (impagos.isNotEmpty()) {
                item {
                    Spacer(Modifier.height(14.dp))
                    SectionHeader("⚠ Tasas impagadas")
                }
                items(impagos.take(3)) { tasa ->
                    AlertaMiniCard(
                        titulo  = tasa.concepto,
                        detalle = tasa.titular?.nombreApellidos ?: "Sin titular",
                        importe = "%.2f €".format(tasa.importe),
                        color   = AlertRed,
                        onClick = { onNavigate("tasas_economicas") }
                    )
                }
                if (impagos.size > 3) {
                    item {
                        TextButton(
                            onClick = { onNavigate("tasas_economicas") },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Ver todos los impagos (${impagos.size})",
                                color = GoldPrimary, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }
        }
    }
}

// ── KPI Card con contador animado ─────────────────────────────────────────────
@Composable
fun KpiCardAnimado(
    valor: String, label: String, icon: ImageVector, color: Color,
    delay: Int, started: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier
) {
    var visible by remember { mutableStateOf(false) }
    val alpha   by animateFloatAsState(
        targetValue = if (visible) 1f else 0f,
        animationSpec = tween(500, delayMillis = delay), label = "kpi_alpha")
    val scale   by animateFloatAsState(
        targetValue = if (visible) 1f else 0.7f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessLow), label = "kpi_scale")

    LaunchedEffect(started) { if (started) visible = true }

    Column(modifier = modifier
        .alpha(alpha).scale(scale)
        .clip(RoundedCornerShape(14.dp))
        .background(color.copy(0.12f))
        .border(1.dp, color.copy(0.3f), RoundedCornerShape(14.dp))
        .clickable { onClick() }
        .padding(12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(5.dp)) {
        Icon(icon, null, tint = color, modifier = Modifier.size(22.dp))
        Text(valor, style = MaterialTheme.typography.titleLarge,
            color = color, fontWeight = FontWeight.Bold)
        Text(label, style = MaterialTheme.typography.labelSmall,
            color = TextSecondary, textAlign = TextAlign.Center)
    }
}

// ── Card de acción con animación de entrada ───────────────────────────────────
@Composable
fun AccionCard(
    accion: Accion, delay: Int, started: Boolean,
    onClick: () -> Unit, modifier: Modifier = Modifier
) {
    var visible by remember { mutableStateOf(false) }
    val alpha   by animateFloatAsState(
        targetValue = if (visible) 1f else 0f,
        animationSpec = tween(400, delayMillis = delay), label = "accion_alpha")
    val offset  by animateIntAsState(
        targetValue = if (visible) 0 else 30,
        animationSpec = tween(400, delayMillis = delay), label = "accion_offset")

    LaunchedEffect(started) { if (started) visible = true }

    Column(modifier = modifier
        .alpha(alpha)
        .offset(y = offset.dp)
        .clip(RoundedCornerShape(14.dp))
        .background(SurfaceCard)
        .border(1.dp, accion.color.copy(0.25f), RoundedCornerShape(14.dp))
        .clickable { onClick() }
        .padding(vertical = 14.dp, horizontal = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Box(modifier = Modifier.size(44.dp).clip(RoundedCornerShape(10.dp))
            .background(accion.color.copy(0.15f)),
            contentAlignment = Alignment.Center) {
            Icon(accion.icon, null, tint = accion.color, modifier = Modifier.size(24.dp))
        }
        Text(accion.label, style = MaterialTheme.typography.labelMedium,
            color = TextPrimary, fontWeight = FontWeight.SemiBold,
            textAlign = TextAlign.Center, maxLines = 2)
    }
}

// ── Mini card de alerta en el dashboard ──────────────────────────────────────
@Composable
fun AlertaMiniCard(
    titulo: String, detalle: String, importe: String,
    color: Color, onClick: () -> Unit
) {
    Row(modifier = Modifier.fillMaxWidth()
        .padding(horizontal = 16.dp, vertical = 4.dp)
        .clip(RoundedCornerShape(12.dp))
        .background(SurfaceCard)
        .border(1.dp, color.copy(0.3f), RoundedCornerShape(12.dp))
        .clickable { onClick() }
        .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(color))
        Column(modifier = Modifier.weight(1f)) {
            Text(titulo, style = MaterialTheme.typography.bodyMedium,
                color = TextPrimary, fontWeight = FontWeight.SemiBold)
            Text(detalle, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
        }
        Text(importe, style = MaterialTheme.typography.titleSmall,
            color = color, fontWeight = FontWeight.Bold)
    }
}
