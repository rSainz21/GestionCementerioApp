package com.corrales.cementerio.ui.screens

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.corrales.cementerio.data.model.*
import com.corrales.cementerio.data.repository.CementerioRepository
import com.corrales.cementerio.ui.components.*
import com.corrales.cementerio.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun AlertasScreen(onNavigate: (String) -> Unit = {}) {
    val scope = rememberCoroutineScope()

    // Datos reales de la API
    var concesionesProximas by remember { mutableStateOf<List<ConcesionResponse>>(emptyList()) }
    var impagos             by remember { mutableStateOf<List<TasaResponse>>(emptyList()) }
    var huerfanos           by remember { mutableStateOf<List<RestosResponse>>(emptyList()) }
    var isLoading           by remember { mutableStateOf(true) }

    // Filtro activo
    var filtro by remember { mutableStateOf<String?>(null) } // null=todas, "VENCIMIENTO","IMPAGO","HUERFANO"

    fun cargar() {
        scope.launch {
            isLoading = true
            CementerioRepository.getAlertasCaducidad(6).onSuccess  { concesionesProximas = it }
            CementerioRepository.getTasasImpagadas().onSuccess      { impagos = it }
            CementerioRepository.getRestosHuerfanos().onSuccess     { huerfanos = it }
            isLoading = false
        }
    }

    LaunchedEffect(Unit) { cargar() }

    CementerioBackground {
        LazyColumn(modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 100.dp)) {

            // ── Cabecera ──────────────────────────────────────────────────────
            item {
                Box(modifier = Modifier.fillMaxWidth().background(NavyMid)
                    .padding(horizontal = 20.dp, vertical = 16.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween) {
                        Column {
                            Text("ALERTAS DEL SISTEMA", style = MaterialTheme.typography.labelSmall,
                                color = GoldPrimary, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
                            if (!isLoading) {
                                Text("${concesionesProximas.size + impagos.size + huerfanos.size} notificaciones activas",
                                    style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                            }
                        }
                        IconButton(onClick = { cargar() }) {
                            Icon(Icons.Default.Refresh, null, tint = GoldPrimary)
                        }
                    }
                }
            }

            if (isLoading) {
                item {
                    Box(Modifier.fillParentMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = GoldPrimary)
                    }
                }
                return@LazyColumn
            }

            // ── Chips de resumen ──────────────────────────────────────────────
            item {
                Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    AlertResumenChip("${impagos.size} Impagos",
                        AlertRed, Modifier.weight(1f))
                    AlertResumenChip("${concesionesProximas.size} Vencimientos",
                        AlertAmber, Modifier.weight(1f))
                    AlertResumenChip("${huerfanos.size} Sin ubicar",
                        NichoPendiente, Modifier.weight(1f))
                }
            }

            // ── Filtros ───────────────────────────────────────────────────────
            item {
                Row(modifier = Modifier.fillMaxWidth()
                    .horizontalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChipCustom(selected = filtro == null, label = "Todas",
                        onClick = { filtro = null })
                    FilterChipCustom(selected = filtro == "IMPAGO", label = "Impagos",
                        onClick = { filtro = if (filtro == "IMPAGO") null else "IMPAGO" },
                        color = AlertRed)
                    FilterChipCustom(selected = filtro == "VENCIMIENTO", label = "Vencimientos",
                        onClick = { filtro = if (filtro == "VENCIMIENTO") null else "VENCIMIENTO" },
                        color = AlertAmber)
                    FilterChipCustom(selected = filtro == "HUERFANO", label = "Sin ubicar",
                        onClick = { filtro = if (filtro == "HUERFANO") null else "HUERFANO" },
                        color = NichoPendiente)
                }
            }

            item { Spacer(Modifier.height(4.dp)) }

            // ── Sección Impagos ───────────────────────────────────────────────
            if ((filtro == null || filtro == "IMPAGO") && impagos.isNotEmpty()) {
                item {
                    SectionHeader("Tasas Impagadas (${impagos.size})")
                }
                items(impagos) { tasa ->
                    AlertaImpagosCard(tasa)
                }
            }

            // ── Sección Vencimientos próximos ─────────────────────────────────
            if ((filtro == null || filtro == "VENCIMIENTO") && concesionesProximas.isNotEmpty()) {
                item {
                    SectionHeader("Concesiones próximas a vencer (${concesionesProximas.size})")
                }
                items(concesionesProximas) { concesion ->
                    AlertaVencimientoCard(concesion)
                }
            }

            // ── Sección Huérfanos ─────────────────────────────────────────────
            if ((filtro == null || filtro == "HUERFANO") && huerfanos.isNotEmpty()) {
                item {
                    SectionHeader("Registros sin ubicar (${huerfanos.size})")
                }
                items(huerfanos) { resto ->
                    AlertaHuerfanoCard(resto) { onNavigate("regularizacion") }
                }
            }

            // Sin alertas
            if (!isLoading && impagos.isEmpty() && concesionesProximas.isEmpty() && huerfanos.isEmpty()) {
                item {
                    Box(Modifier.fillParentMaxWidth().padding(64.dp),
                        contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Icon(Icons.Default.CheckCircle, null, tint = AlertGreen,
                                modifier = Modifier.size(56.dp))
                            Text("Sin alertas activas", style = MaterialTheme.typography.titleMedium,
                                color = AlertGreen)
                            Text("Todo en orden", style = MaterialTheme.typography.bodySmall,
                                color = TextSecondary)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun AlertaImpagosCard(tasa: TasaResponse) {
    AlertaBaseCard(
        color = AlertRed, icon = Icons.Default.MoneyOff,
        titulo = tasa.concepto,
        subtitulo = tasa.titular?.nombreApellidos ?: "Sin titular",
        detalle = "${tasa.importe.let { "%.2f €".format(it) }} · Emitida: ${tasa.fechaEmision}",
        chip = "IMPAGO"
    )
}

@Composable
fun AlertaVencimientoCard(concesion: ConcesionResponse) {
    AlertaBaseCard(
        color = AlertAmber, icon = Icons.Default.Schedule,
        titulo = "Vence ${concesion.fechaVencimiento ?: "—"}",
        subtitulo = concesion.titular?.nombreApellidos ?: "Sin titular",
        detalle = "Nicho: ${concesion.unidad?.codigo ?: "ID ${concesion.unidad?.id}"}",
        chip = "VENCE PRONTO"
    )
}

@Composable
fun AlertaHuerfanoCard(resto: RestosResponse, onUbicar: () -> Unit = {}) {
    AlertaBaseCard(
        color = NichoPendiente, icon = Icons.Default.PersonSearch,
        titulo = resto.nombreApellidos,
        subtitulo = resto.fechaInhumacion?.let { "Inhumado: $it" } ?: "Fecha desconocida",
        detalle = resto.notasHistoricas ?: "Sin notas históricas",
        chip = "SIN UBICAR"
    )
}

@Composable
fun AlertaBaseCard(
    color: Color, icon: ImageVector,
    titulo: String, subtitulo: String, detalle: String, chip: String
) {
    Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 5.dp)
        .clip(RoundedCornerShape(14.dp)).background(SurfaceCard)
        .border(1.dp, color.copy(0.25f), RoundedCornerShape(14.dp)),
        verticalAlignment = Alignment.CenterVertically) {
        Box(modifier = Modifier.width(5.dp).height(80.dp).background(color))
        Row(modifier = Modifier.weight(1f).padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(modifier = Modifier.size(44.dp).clip(RoundedCornerShape(11.dp))
                .background(color.copy(0.15f)), contentAlignment = Alignment.Center) {
                Icon(icon, null, tint = color, modifier = Modifier.size(22.dp))
            }
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Row(modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top) {
                    Text(titulo, style = MaterialTheme.typography.bodyMedium,
                        color = TextPrimary, fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.weight(1f))
                    Box(modifier = Modifier.clip(RoundedCornerShape(6.dp))
                        .background(color.copy(0.2f))
                        .padding(horizontal = 6.dp, vertical = 2.dp)) {
                        Text(chip, style = MaterialTheme.typography.labelSmall,
                            color = color, fontWeight = FontWeight.Bold)
                    }
                }
                Text(subtitulo, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                if (detalle.isNotBlank()) {
                    Text(detalle, style = MaterialTheme.typography.labelSmall, color = TextDisabled,
                        maxLines = 2)
                }
            }
        }
    }
}

@Composable
fun AlertResumenChip(text: String, color: Color, modifier: Modifier = Modifier) {
    Box(modifier = modifier.clip(RoundedCornerShape(10.dp))
        .background(color.copy(0.15f))
        .border(1.dp, color.copy(0.4f), RoundedCornerShape(10.dp))
        .padding(vertical = 10.dp),
        contentAlignment = Alignment.Center) {
        Text(text, style = MaterialTheme.typography.labelLarge,
            color = color, fontWeight = FontWeight.Bold)
    }
}
