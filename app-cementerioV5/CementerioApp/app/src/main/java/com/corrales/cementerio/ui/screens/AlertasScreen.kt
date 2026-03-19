package com.corrales.cementerio.ui.screens

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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.corrales.cementerio.data.model.*
import com.corrales.cementerio.ui.components.*
import com.corrales.cementerio.ui.theme.*

@Composable
fun AlertasScreen() {
    val alertas = SampleData.alertas
    var filtro by remember { mutableStateOf<TipoAlerta?>(null) }
    val filtradas = if (filtro == null) alertas else alertas.filter { it.tipo == filtro }

    CementerioBackground {
        LazyColumn(modifier = Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 100.dp)) {
            item {
                Box(modifier = Modifier.fillMaxWidth().background(NavyMid).padding(horizontal = 20.dp, vertical = 16.dp)) {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("ALERTAS DEL SISTEMA", style = MaterialTheme.typography.labelSmall, color = GoldPrimary, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
                        Text("${alertas.size} notificaciones activas", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                    }
                }
            }
            item {
                Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    val rojo   = alertas.count { it.tipo == TipoAlerta.IMPAGO || it.tipo == TipoAlerta.VENCIMIENTO_HOY }
                    val ambar  = alertas.count { it.tipo == TipoAlerta.VENCIMIENTO_PROXIMO || it.tipo == TipoAlerta.CAMPO_PENDIENTE }
                    val morado = alertas.count { it.tipo == TipoAlerta.HUERFANO }
                    AlertResumenChip("$rojo Críticas", AlertRed, Modifier.weight(1f))
                    AlertResumenChip("$ambar Avisos",  AlertAmber, Modifier.weight(1f))
                    AlertResumenChip("$morado Info",   NichoPendiente, Modifier.weight(1f))
                }
            }
            item {
                Row(modifier = Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChipCustom(selected = filtro == null, label = "Todas", onClick = { filtro = null })
                    TipoAlerta.values().forEach { tipo ->
                        FilterChipCustom(
                            selected = filtro == tipo, label = tipo.label,
                            onClick = { filtro = if (filtro == tipo) null else tipo },
                            color = when (tipo) {
                                TipoAlerta.IMPAGO, TipoAlerta.VENCIMIENTO_HOY -> AlertRed
                                TipoAlerta.VENCIMIENTO_PROXIMO, TipoAlerta.CAMPO_PENDIENTE -> AlertAmber
                                TipoAlerta.HUERFANO -> NichoPendiente
                            }
                        )
                    }
                }
            }
            item { Spacer(Modifier.height(4.dp)) }
            items(filtradas) { AlertaCardDetallada(it) }
        }
    }
}

@Composable
fun AlertResumenChip(text: String, color: Color, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier.clip(RoundedCornerShape(10.dp))
            .background(color.copy(alpha = 0.15f))
            .border(1.dp, color.copy(alpha = 0.4f), RoundedCornerShape(10.dp))
            .padding(vertical = 10.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(text, style = MaterialTheme.typography.labelLarge, color = color, fontWeight = FontWeight.Bold)
    }
}

@Composable
fun AlertaCardDetallada(alerta: AlertaSistema) {
    val color: Color = when (alerta.tipo) {
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
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 5.dp)
            .clip(RoundedCornerShape(14.dp)).background(SurfaceCard)
            .border(1.dp, color.copy(alpha = 0.25f), RoundedCornerShape(14.dp)),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(modifier = Modifier.width(5.dp).height(80.dp).background(color))
        Row(modifier = Modifier.weight(1f).padding(14.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(modifier = Modifier.size(44.dp).clip(RoundedCornerShape(11.dp)).background(color.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
                Icon(icon, null, tint = color, modifier = Modifier.size(22.dp))
            }
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Top) {
                    Text(alerta.titulo, style = MaterialTheme.typography.bodyMedium, color = TextPrimary, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                    AlertaChip(alerta.tipo)
                }
                Text(alerta.descripcion, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                Text(alerta.fechaAlerta.toString(), style = MaterialTheme.typography.labelSmall, color = TextDisabled)
            }
        }
    }
}
