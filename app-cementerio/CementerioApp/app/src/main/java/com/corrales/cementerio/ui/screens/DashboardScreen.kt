package com.corrales.cementerio.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.corrales.cementerio.data.model.*
import com.corrales.cementerio.ui.components.*
import com.corrales.cementerio.ui.theme.*

@Composable
fun DashboardScreen(onNavigate: (String) -> Unit = {}) {
    val stats = SampleData.estadisticas
    val alertas = SampleData.alertas.filter { !it.leida }

    CementerioBackground {
        LazyColumn(modifier = Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 100.dp)) {
            item { DashboardHeader() }
            item { SectionHeader("Resumen General") }
            item { KpiGrid(stats) }
            item {
                SectionHeader("Estado del Cementerio", trailing = {
                    TextButton(onClick = { onNavigate("mapa") }) {
                        Text("Ver mapa", color = GoldPrimary, style = MaterialTheme.typography.labelLarge)
                    }
                })
            }
            item { EstadoDistribucionCard(stats) }
            item {
                SectionHeader("Alertas Activas", trailing = {
                    Box(modifier = Modifier.clip(CircleShape).background(AlertRed.copy(alpha = 0.2f)).padding(horizontal = 10.dp, vertical = 3.dp)) {
                        Text("${alertas.size}", style = MaterialTheme.typography.labelLarge, color = AlertRed, fontWeight = FontWeight.Bold)
                    }
                })
            }
            items(alertas) { AlertaCard(it) }
            item {
                SectionHeader("Bloques", trailing = {
                    TextButton(onClick = { onNavigate("nichos") }) {
                        Text("Ver todos", color = GoldPrimary, style = MaterialTheme.typography.labelLarge)
                    }
                })
            }
            items(SampleData.bloques) { BloqueResumenCard(it) { onNavigate("nichos") } }
            item { SectionHeader("Acciones Rápidas") }
            item { AccionesRapidasGrid(onNavigate) }
        }
    }
}

@Composable
fun DashboardHeader() {
    Box(modifier = Modifier.fillMaxWidth().background(Brush.verticalGradient(listOf(NavyMid, NavyDeep)))) {
        Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 24.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                Column {
                    Text("AYUNTAMIENTO", style = MaterialTheme.typography.labelSmall, color = GoldPrimary, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
                    Text("Los Corrales de Buelna", style = MaterialTheme.typography.displayMedium, color = TextPrimary, fontWeight = FontWeight.Bold)
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 4.dp)) {
                        Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(AlertGreen))
                        Text("Sistema activo · Gestión de Cementerios", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                    }
                }
                Box(modifier = Modifier.size(60.dp).clip(CircleShape).background(GoldPrimary.copy(alpha = 0.12f)).border(2.dp, GoldPrimary.copy(alpha = 0.5f), CircleShape), contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.AccountBalance, null, tint = GoldPrimary, modifier = Modifier.size(30.dp))
                }
            }
            Spacer(Modifier.height(16.dp))
            Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(Brush.horizontalGradient(listOf(GoldPrimary.copy(alpha = 0.8f), Color.Transparent))))
        }
    }
}

@Composable
fun KpiGrid(stats: EstadisticasCementerio) {
    Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            KpiCard("Total Nichos", "${stats.totalNichos}", { Icon(Icons.Default.GridView, null, modifier = Modifier.size(22.dp)) }, GoldPrimary, Modifier.weight(1f))
            KpiCard("Ocupados", "${stats.ocupados}", { Icon(Icons.Default.PersonPin, null, modifier = Modifier.size(22.dp)) }, NichoOcupado, Modifier.weight(1f))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            KpiCard("Libres", "${stats.libres}", { Icon(Icons.Default.CheckCircle, null, modifier = Modifier.size(22.dp)) }, NichoLibre, Modifier.weight(1f))
            KpiCard("Alertas", "${stats.alertasActivas}", { Icon(Icons.Default.Warning, null, modifier = Modifier.size(22.dp)) }, AlertRed, Modifier.weight(1f))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            KpiCard("Sin ubicar", "${stats.huerfanos}", { Icon(Icons.Default.HelpOutline, null, modifier = Modifier.size(22.dp)) }, NichoPendiente, Modifier.weight(1f))
            KpiCard("Ingresos/Mes", "${stats.ingresosMes.toInt()}€", { Icon(Icons.Default.Euro, null, modifier = Modifier.size(22.dp)) }, AlertGreen, Modifier.weight(1f))
        }
    }
}

@Composable
fun EstadoDistribucionCard(stats: EstadisticasCementerio) {
    GoldBorderCard(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp)) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            val total = stats.totalNichos.toFloat()
            val bars = listOf(
                Triple("Ocupados",  stats.ocupados.toFloat()  / total, NichoOcupado),
                Triple("Libres",    stats.libres.toFloat()    / total, NichoLibre),
                Triple("Caducados", stats.caducados.toFloat() / total, NichoCaducado),
                Triple("Sin ubicar",stats.huerfanos.toFloat() / total, NichoPendiente),
            )
            Row(modifier = Modifier.fillMaxWidth().height(14.dp).clip(RoundedCornerShape(7.dp)).background(SurfaceSunken)) {
                bars.forEach { (_, pct, color) ->
                    Box(modifier = Modifier.fillMaxHeight().weight(pct.coerceAtLeast(0.01f)).background(color))
                }
            }
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                bars.forEach { (label, pct, color) ->
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(color))
                            Text(label, style = MaterialTheme.typography.labelSmall, color = TextSecondary)
                        }
                        Text("${(pct * 100).toInt()}%", style = MaterialTheme.typography.bodyMedium, color = TextPrimary, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
fun AlertaCard(alerta: AlertaSistema) {
    val leftColor = when (alerta.tipo) {
        TipoAlerta.IMPAGO, TipoAlerta.VENCIMIENTO_HOY -> AlertRed
        TipoAlerta.VENCIMIENTO_PROXIMO, TipoAlerta.CAMPO_PENDIENTE -> AlertAmber
        TipoAlerta.HUERFANO -> NichoPendiente
    }
    val icon: ImageVector = when (alerta.tipo) {
        TipoAlerta.IMPAGO -> Icons.Default.MoneyOff
        TipoAlerta.VENCIMIENTO_HOY, TipoAlerta.VENCIMIENTO_PROXIMO -> Icons.Default.Schedule
        TipoAlerta.HUERFANO -> Icons.Default.PersonSearch
        TipoAlerta.CAMPO_PENDIENTE -> Icons.Default.PhotoCamera
    }
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp)
            .clip(RoundedCornerShape(12.dp)).background(SurfaceCard)
            .border(1.dp, leftColor.copy(alpha = 0.3f), RoundedCornerShape(12.dp)),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(modifier = Modifier.width(5.dp).height(70.dp).background(leftColor))
        Row(modifier = Modifier.weight(1f).padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(modifier = Modifier.size(38.dp).clip(RoundedCornerShape(10.dp)).background(leftColor.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
                Icon(icon, null, tint = leftColor, modifier = Modifier.size(20.dp))
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(alerta.titulo, style = MaterialTheme.typography.bodyMedium, color = TextPrimary, fontWeight = FontWeight.SemiBold)
                Text(alerta.descripcion, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
            }
            Icon(Icons.Default.ChevronRight, null, tint = TextDisabled, modifier = Modifier.size(18.dp))
        }
    }
}

@Composable
fun BloqueResumenCard(bloque: BloqueNichos, onClick: () -> Unit) {
    GoldBorderCard(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp), onClick = onClick) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                Text(bloque.nombre, style = MaterialTheme.typography.titleMedium, color = TextPrimary, fontWeight = FontWeight.Bold)
                Text("${bloque.filas}×${bloque.columnas} · ${bloque.totalNichos}", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
            }
            val pct = bloque.ocupados.toFloat() / bloque.totalNichos
            Box(modifier = Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp)).background(SurfaceSunken)) {
                Box(modifier = Modifier.fillMaxHeight().fillMaxWidth(pct).clip(RoundedCornerShape(4.dp)).background(NichoOcupado))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                MiniStat("${bloque.ocupados}", "Ocup.", NichoOcupado)
                MiniStat("${bloque.libres}", "Libres", NichoLibre)
                MiniStat("${bloque.caducados}", "Cad.", NichoCaducado)
                MiniStat("${bloque.pendientes}", "Pend.", NichoPendiente)
            }
        }
    }
}

@Composable
fun AccionesRapidasGrid(onNavigate: (String) -> Unit) {
    data class Accion(val label: String, val icon: ImageVector, val route: String, val color: Color)
    val acciones = listOf(
        Accion("Nueva inhumación",  Icons.Default.Add,             "nuevo_nicho",  GoldPrimary),
        Accion("Trabajo de campo",  Icons.Default.DirectionsWalk,  "campo",   AlertAmber),
        Accion("Regularización",    Icons.Default.AssignmentLate,  "regularizacion",    NichoPendiente),
        Accion("Cobros / Tasas",    Icons.Default.Payment,         "tasas_economicas",  NichoCaducado),
        Accion("Ver mapa",          Icons.Default.Map,             "mapa",    NichoOcupado),
        Accion("Alertas",           Icons.Default.NotificationsActive, "alertas",          AlertRed),
    )
    Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        acciones.chunked(3).forEach { fila ->
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                fila.forEach { accion ->
                    Box(
                        modifier = Modifier.weight(1f).aspectRatio(1f)
                            .clip(RoundedCornerShape(16.dp)).background(SurfaceCard)
                            .border(1.dp, accion.color.copy(alpha = 0.3f), RoundedCornerShape(16.dp))
                            .clickable { onNavigate(accion.route) },
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Box(modifier = Modifier.size(44.dp).clip(RoundedCornerShape(12.dp)).background(accion.color.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
                                Icon(accion.icon, null, tint = accion.color, modifier = Modifier.size(22.dp))
                            }
                            Text(accion.label, style = MaterialTheme.typography.labelSmall, color = TextSecondary, maxLines = 2, textAlign = TextAlign.Center, modifier = Modifier.padding(horizontal = 4.dp))
                        }
                    }
                }
                repeat(3 - fila.size) { Spacer(modifier = Modifier.weight(1f)) }
            }
        }
    }
}
