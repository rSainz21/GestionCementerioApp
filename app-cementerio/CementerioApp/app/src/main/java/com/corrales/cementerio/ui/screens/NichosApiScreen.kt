package com.corrales.cementerio.ui.screens

import androidx.compose.animation.AnimatedVisibility
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.*
import com.corrales.cementerio.data.model.UnidadResponse
import com.corrales.cementerio.data.repository.CementerioRepository
import com.corrales.cementerio.ui.components.*
import com.corrales.cementerio.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun NichosApiScreen(
    bloqueId: Int,
    nombreBloque: String = "Nichos",
    onNichoClick: (UnidadResponse) -> Unit = {},
    onBack: () -> Unit = {}
) {
    val scope = rememberCoroutineScope()
    var unidades    by remember { mutableStateOf<List<UnidadResponse>>(emptyList()) }
    var isLoading   by remember { mutableStateOf(true) }
    var errorMsg    by remember { mutableStateOf("") }
    var query       by remember { mutableStateOf("") }
    var filtroEstado by remember { mutableStateOf<String?>(null) }
    var showFilters by remember { mutableStateOf(false) }

    LaunchedEffect(bloqueId) {
        isLoading = true
        CementerioRepository.getUnidades(bloqueId)
            .onSuccess { unidades = it; isLoading = false }
            .onFailure { errorMsg = it.message ?: "Error al cargar"; isLoading = false }
    }

    val filtered = unidades.filter { u ->
        val matchQ = query.isBlank() ||
            (u.codigo?.contains(query, true) == true) ||
            (u.tipo?.contains(query, true) == true)
        val matchE = filtroEstado == null ||
            u.estado?.uppercase() == filtroEstado?.uppercase()
        matchQ && matchE
    }

    val libres   = unidades.count { it.estado?.uppercase() == "LIBRE" }
    val ocupados = unidades.count { it.estado?.uppercase() == "OCUPADO" }
    val caducados = unidades.count { it.estado?.uppercase() == "CADUCADO" }

    CementerioBackground {
        Column(modifier = Modifier.fillMaxSize()) {
            // Header
            Box(modifier = Modifier.fillMaxWidth().background(NavyMid).padding(horizontal = 20.dp, vertical = 14.dp)) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        IconButton(onClick = onBack) {
                            Icon(Icons.Default.ArrowBack, null, tint = GoldPrimary)
                        }
                        Column(modifier = Modifier.weight(1f)) {
                            Text(nombreBloque, style = MaterialTheme.typography.titleLarge, color = TextPrimary, fontWeight = FontWeight.Bold)
                            Text("${filtered.size} de ${unidades.size} nichos", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                        }
                        IconButton(
                            onClick = { showFilters = !showFilters },
                            modifier = Modifier.clip(RoundedCornerShape(10.dp))
                                .background(if (showFilters) GoldPrimary.copy(0.2f) else SurfaceCard)
                                .border(1.dp, if (showFilters) GoldPrimary else BorderSubtle, RoundedCornerShape(10.dp))
                        ) {
                            Icon(Icons.Default.FilterList, null, tint = if (showFilters) GoldPrimary else TextSecondary)
                        }
                    }
                    SearchField(value = query, onValueChange = { query = it })
                }
            }

            // Stats rápidas
            if (!isLoading && unidades.isNotEmpty()) {
                Row(
                    modifier = Modifier.fillMaxWidth().background(SurfaceCard).padding(horizontal = 16.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    MiniStat("$ocupados", "Ocupados", NichoOcupado)
                    MiniStat("$libres", "Libres", NichoLibre)
                    MiniStat("$caducados", "Caducados", NichoCaducado)
                    MiniStat("${unidades.size}", "Total", GoldPrimary)
                }
            }

            // Filtros
            AnimatedVisibility(visible = showFilters) {
                Row(
                    modifier = Modifier.fillMaxWidth().background(SurfaceCard)
                        .horizontalScroll(rememberScrollState()).padding(12.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    FilterChipCustom(selected = filtroEstado == null, label = "Todos", onClick = { filtroEstado = null })
                    listOf("LIBRE", "OCUPADO", "CADUCADO", "RESERVADO").forEach { estado ->
                        val color = when (estado) {
                            "LIBRE" -> NichoLibre; "OCUPADO" -> NichoOcupado
                            "CADUCADO" -> NichoCaducado; else -> NichoReservado
                        }
                        FilterChipCustom(
                            selected = filtroEstado == estado,
                            label = estado.lowercase().replaceFirstChar { it.uppercase() },
                            onClick = { filtroEstado = if (filtroEstado == estado) null else estado },
                            color = color
                        )
                    }
                }
            }

            // Contenido
            when {
                isLoading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = GoldPrimary)
                }
                errorMsg.isNotBlank() -> Box(Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Icon(Icons.Default.WifiOff, null, tint = AlertRed, modifier = Modifier.size(48.dp))
                        Text(errorMsg, color = AlertRed, style = MaterialTheme.typography.bodyMedium)
                        Button(onClick = {
                            scope.launch {
                                isLoading = true; errorMsg = ""
                                CementerioRepository.getUnidades(bloqueId)
                                    .onSuccess { unidades = it; isLoading = false }
                                    .onFailure { errorMsg = it.message ?: "Error"; isLoading = false }
                            }
                        }, colors = ButtonDefaults.buttonColors(containerColor = GoldPrimary)) {
                            Text("Reintentar", color = NavyDeep)
                        }
                    }
                }
                else -> LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                ) {
                    if (filtered.isEmpty()) {
                        item {
                            Box(Modifier.fillMaxWidth().padding(48.dp), contentAlignment = Alignment.Center) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Icon(Icons.Default.SearchOff, null, tint = TextDisabled, modifier = Modifier.size(48.dp))
                                    Text("Sin resultados", color = TextSecondary, style = MaterialTheme.typography.titleMedium)
                                }
                            }
                        }
                    } else {
                        items(filtered, key = { it.id ?: it.hashCode() }) { unidad ->
                            UnidadApiCard(unidad) { onNichoClick(unidad) }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun UnidadApiCard(unidad: UnidadResponse, onClick: () -> Unit) {
    val estadoUp = unidad.estado?.uppercase() ?: "LIBRE"
    val color = when (estadoUp) {
        "OCUPADO"   -> NichoOcupado
        "LIBRE"     -> NichoLibre
        "CADUCADO"  -> NichoCaducado
        "RESERVADO" -> NichoReservado
        else        -> NichoPendiente
    }
    val estadoLabel = unidad.estado?.lowercase()?.replaceFirstChar { it.uppercase() } ?: "Libre"

    GoldBorderCard(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 5.dp),
        onClick = onClick
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Box(modifier = Modifier.width(4.dp).height(56.dp).clip(RoundedCornerShape(2.dp)).background(color))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    unidad.codigo ?: "Nicho ${unidad.numero}",
                    style = MaterialTheme.typography.titleMedium,
                    color = TextPrimary,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    "Fila ${unidad.fila ?: "—"} · ${unidad.tipo ?: "Nicho"}",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary
                )
            }
            // Estado chip
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(50))
                    .background(color.copy(alpha = 0.2f))
                    .border(1.dp, color.copy(0.5f), RoundedCornerShape(50))
                    .padding(horizontal = 10.dp, vertical = 4.dp)
            ) {
                Text(estadoLabel, style = MaterialTheme.typography.labelSmall, color = color, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}
