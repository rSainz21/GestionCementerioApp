package com.corrales.cementerio.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.corrales.cementerio.data.model.*
import com.corrales.cementerio.ui.components.*
import com.corrales.cementerio.ui.theme.*

@Composable
fun TrabajosCampoScreen(onNavigate: (String) -> Unit = {}, onClick: (String) -> Unit) {
    val huerfanos = SampleData.unidades.filter { it.esHuerfano }

    CementerioBackground {
        LazyColumn(modifier = Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 100.dp)) {
            item {
                Box(
                    modifier = Modifier.fillMaxWidth()
                        .background(Brush.verticalGradient(listOf(AlertAmber.copy(alpha = 0.15f), Color.Transparent)))
                        .padding(20.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            Box(modifier = Modifier.size(40.dp).clip(RoundedCornerShape(10.dp)).background(AlertAmber.copy(alpha = 0.2f)), contentAlignment = Alignment.Center) {
                                Icon(Icons.Default.DirectionsWalk, null, tint = AlertAmber, modifier = Modifier.size(22.dp))
                            }
                            Column {
                                Text("TRABAJO DE CAMPO", style = MaterialTheme.typography.labelSmall, color = AlertAmber, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
                                Text("Factor crítico del proyecto", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                            }
                        }
                        Text("La tecnología sola no resuelve el desorden documental. Los operarios deben verificar físicamente cada nicho.",
                            style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
                    }
                }
            }

            item { SectionHeader("Progreso de Verificación") }
            item { ProgresoCard() }
            item { SectionHeader("Herramientas de Campo") }
            item {
                Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    AccionCampo("Bandeja de Regularización", "Ubica registros huérfanos de libros históricos", Icons.Default.AssignmentLate, NichoPendiente) { onClick("regularizacion") }
                    AccionCampo("Fotografiar Lápida", "Añade foto al expediente del nicho activo", Icons.Default.PhotoCamera, GoldPrimary) { onNavigate("camara/CAMPO") }
                    AccionCampo("Registrar Discrepancia", "El papel no coincide con la lápida", Icons.Default.ReportProblem, AlertRed) {}
                    AccionCampo("Nicho verificado ✓", "Marcar nicho como comprobado in situ", Icons.Default.CheckCircle, AlertGreen) {}
                }
            }
            item {
                SectionHeader("Registros Sin Ubicar", trailing = {
                    Box(modifier = Modifier.clip(RoundedCornerShape(6.dp)).background(NichoPendiente.copy(alpha = 0.2f)).padding(horizontal = 8.dp, vertical = 3.dp)) {
                        Text("${huerfanos.size} pendientes", style = MaterialTheme.typography.labelSmall, color = NichoPendiente)
                    }
                })
            }
            if (huerfanos.isEmpty()) {
                item {
                    Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Icon(Icons.Default.CheckCircle, null, tint = AlertGreen, modifier = Modifier.size(48.dp))
                            Text("¡Sin registros huérfanos!", style = MaterialTheme.typography.titleMedium, color = AlertGreen)
                        }
                    }
                }
            } else {
                items(huerfanos) { HuerfanoCard(it) }
            }
        }
    }
}

@Composable
fun ProgresoCard() {
    val total = SampleData.estadisticas.totalNichos
    val verificados = total - SampleData.estadisticas.huerfanos - 18
    val pct = verificados.toFloat() / total

    GoldBorderCard(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp)) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Nichos verificados", style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                Text("$verificados / $total", style = MaterialTheme.typography.titleMedium, color = GoldPrimary, fontWeight = FontWeight.Bold)
            }
            Box(modifier = Modifier.fillMaxWidth().height(12.dp).clip(RoundedCornerShape(6.dp)).background(SurfaceSunken)) {
                Box(modifier = Modifier.fillMaxWidth(pct).fillMaxHeight().clip(RoundedCornerShape(6.dp))
                    .background(Brush.horizontalGradient(listOf(GoldDim, GoldPrimary, GoldLight))))
            }
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                MiniStat("$verificados", "Verificados", AlertGreen)
                MiniStat("${SampleData.estadisticas.huerfanos}", "Huérfanos", NichoPendiente)
                MiniStat("18", "Pendientes", AlertAmber)
                MiniStat("${(pct * 100).toInt()}%", "Progreso", GoldPrimary)
            }
        }
    }
}

@Composable
fun AccionCampo(title: String, desc: String, icon: ImageVector, color: Color, onClick: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp))
            .background(SurfaceCard).border(1.dp, color.copy(alpha = 0.35f), RoundedCornerShape(14.dp))
            .clickable { onClick() }.padding(16.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Box(modifier = Modifier.size(48.dp).clip(RoundedCornerShape(12.dp)).background(color.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
            Icon(icon, null, tint = color, modifier = Modifier.size(24.dp))
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.titleMedium, color = TextPrimary, fontWeight = FontWeight.SemiBold)
            Text(desc, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
        }
        Icon(Icons.Default.ChevronRight, null, tint = color.copy(alpha = 0.6f))
    }
}

@Composable
fun HuerfanoCard(unidad: UnidadEnterramiento) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp)
            .clip(RoundedCornerShape(12.dp)).background(SurfaceCard)
            .border(1.dp, NichoPendiente.copy(alpha = 0.4f), RoundedCornerShape(12.dp))
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Box(modifier = Modifier.size(42.dp).clip(RoundedCornerShape(10.dp)).background(NichoPendiente.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
            Icon(Icons.Default.PersonSearch, null, tint = NichoPendiente, modifier = Modifier.size(22.dp))
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(unidad.codigo, style = MaterialTheme.typography.bodyMedium, color = TextPrimary, fontWeight = FontWeight.SemiBold)
            unidad.difuntos.firstOrNull()?.let { d ->
                Text("${d.nombre} ${d.apellidos}", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                Text("† ${d.fechaDefuncion.year}", style = MaterialTheme.typography.labelSmall, color = TextDisabled)
            }
            if (unidad.notas.isNotBlank())
                Text(unidad.notas, style = MaterialTheme.typography.labelSmall, color = NichoPendiente.copy(alpha = 0.8f), maxLines = 2)
        }
        Box(modifier = Modifier.clip(RoundedCornerShape(6.dp)).background(NichoPendiente.copy(alpha = 0.2f)).padding(horizontal = 8.dp, vertical = 4.dp)) {
            Text("Ubicar", style = MaterialTheme.typography.labelSmall, color = NichoPendiente, fontWeight = FontWeight.SemiBold)
        }
    }
}
