package com.corrales.cementerio.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.corrales.cementerio.data.model.*
import com.corrales.cementerio.ui.components.*
import com.corrales.cementerio.ui.theme.*

@Composable
fun NichosScreen(onNichoClick: (UnidadEnterramiento) -> Unit = {}) {
    var query by remember { mutableStateOf("") }
    var filtroEstado by remember { mutableStateOf<EstadoNicho?>(null) }
    var filtroBloque by remember { mutableStateOf<String?>(null) }
    var showFilters by remember { mutableStateOf(false) }

    val bloques = SampleData.bloques.map { it.nombre }
    val filtered = SampleData.unidades.filter { u ->
        val matchQ = query.isBlank() ||
            u.codigo.contains(query, ignoreCase = true) ||
            u.bloque.contains(query, ignoreCase = true) ||
            u.difuntos.any { "${it.nombre} ${it.apellidos}".contains(query, ignoreCase = true) }
        val matchE = filtroEstado == null || u.estado == filtroEstado
        val matchB = filtroBloque == null || u.bloque == filtroBloque
        matchQ && matchE && matchB
    }

    CementerioBackground {
        Column(modifier = Modifier.fillMaxSize()) {
            Box(modifier = Modifier.fillMaxWidth().background(NavyMid).padding(horizontal = 20.dp, vertical = 16.dp)) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                        Column {
                            Text("GESTIÓN DE NICHOS", style = MaterialTheme.typography.labelSmall, color = GoldPrimary, letterSpacing = 2.sp)
                            Text("${filtered.size} de ${SampleData.unidades.size} unidades", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            IconButton(
                                onClick = { showFilters = !showFilters },
                                modifier = Modifier.clip(RoundedCornerShape(10.dp))
                                    .background(if (showFilters) GoldPrimary.copy(alpha = 0.2f) else SurfaceCard)
                                    .border(1.dp, if (showFilters) GoldPrimary else BorderSubtle, RoundedCornerShape(10.dp))
                            ) {
                                Icon(Icons.Default.FilterList, null, tint = if (showFilters) GoldPrimary else TextSecondary)
                            }
                            IconButton(onClick = {}, modifier = Modifier.clip(RoundedCornerShape(10.dp)).background(GoldPrimary)) {
                                Icon(Icons.Default.Add, null, tint = NavyDeep)
                            }
                        }
                    }
                    SearchField(value = query, onValueChange = { query = it })
                }
            }

            AnimatedVisibility(visible = showFilters) {
                Column(modifier = Modifier.fillMaxWidth().background(SurfaceCard).padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Estado:", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.horizontalScroll(rememberScrollState())) {
                        FilterChipCustom(selected = filtroEstado == null, label = "Todos", onClick = { filtroEstado = null })
                        EstadoNicho.values().forEach { estado ->
                            FilterChipCustom(
                                selected = filtroEstado == estado, label = estado.label,
                                onClick = { filtroEstado = if (filtroEstado == estado) null else estado },
                                color = when (estado) {
                                    EstadoNicho.OCUPADO -> NichoOcupado; EstadoNicho.LIBRE -> NichoLibre
                                    EstadoNicho.CADUCADO -> NichoCaducado; EstadoNicho.RESERVADO -> NichoReservado
                                    EstadoNicho.PENDIENTE -> NichoPendiente
                                }
                            )
                        }
                    }
                    Text("Bloque:", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.horizontalScroll(rememberScrollState())) {
                        FilterChipCustom(selected = filtroBloque == null, label = "Todos", onClick = { filtroBloque = null })
                        bloques.forEach { b ->
                            FilterChipCustom(selected = filtroBloque == b, label = b, onClick = { filtroBloque = if (filtroBloque == b) null else b })
                        }
                    }
                }
            }

            val huerfanos = filtered.filter { it.esHuerfano }
            if (huerfanos.isNotEmpty()) {
                Row(
                    modifier = Modifier.fillMaxWidth().background(NichoPendiente.copy(alpha = 0.15f)).padding(horizontal = 20.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Icon(Icons.Default.Warning, null, tint = NichoPendiente, modifier = Modifier.size(18.dp))
                    Text("${huerfanos.size} registros sin ubicación · Requieren trabajo de campo", style = MaterialTheme.typography.bodySmall, color = NichoPendiente)
                }
            }

            LazyColumn(modifier = Modifier.fillMaxSize(),) {
                if (filtered.isEmpty()) {
                    item {
                        Box(modifier = Modifier.fillMaxWidth().padding(48.dp), contentAlignment = Alignment.Center) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Icon(Icons.Default.SearchOff, null, tint = TextDisabled, modifier = Modifier.size(48.dp))
                                Text("Sin resultados", style = MaterialTheme.typography.titleMedium, color = TextSecondary)
                            }
                        }
                    }
                } else {
                    items(filtered, key = { it.id }) { NichoListCard(it) { onNichoClick(it) } }
                }
            }
        }
    }
}
