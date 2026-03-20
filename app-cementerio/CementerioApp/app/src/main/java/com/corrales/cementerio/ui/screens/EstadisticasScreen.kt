package com.corrales.cementerio.ui.screens

import android.graphics.Color as AndroidColor
import android.view.ViewGroup
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.*
import androidx.compose.ui.viewinterop.AndroidView
import com.corrales.cementerio.data.model.*
import com.corrales.cementerio.data.repository.CementerioRepository
import com.corrales.cementerio.ui.components.*
import com.corrales.cementerio.ui.theme.*
import com.github.mikephil.charting.charts.BarChart
import com.github.mikephil.charting.charts.PieChart
import com.github.mikephil.charting.components.Legend
import com.github.mikephil.charting.data.*
import com.github.mikephil.charting.formatter.PercentFormatter
import kotlinx.coroutines.launch

/**
 * Pantalla de estadísticas y analítica del cementerio.
 * - Gráfico circular de ocupación
 * - Contadores animados de KPIs
 * - Evolución de inhumaciones
 * - Estado económico
 */
@Composable
fun EstadisticasScreen(onBack: () -> Unit = {}) {
    val scope = rememberCoroutineScope()

    var unidades    by remember { mutableStateOf<List<UnidadResponse>>(emptyList()) }
    var tasas       by remember { mutableStateOf<List<TasaResponse>>(emptyList()) }
    var huerfanos   by remember { mutableStateOf<List<RestosResponse>>(emptyList()) }
    var cargando    by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        scope.launch {
            CementerioRepository.listarTodasUnidades().onSuccess { unidades = it }
            CementerioRepository.getTodasTasas().onSuccess { tasas = it }
            CementerioRepository.getRestosHuerfanos().onSuccess { huerfanos = it }
            cargando = false
        }
    }

    // Calcular estadísticas
    val total      = unidades.size.takeIf { it > 0 } ?: 1
    val ocupados   = unidades.count { it.estado?.uppercase() == "OCUPADO" }
    val libres     = unidades.count { it.estado?.uppercase() == "LIBRE" }
    val caducados  = unidades.count { it.estado?.uppercase() == "CADUCADO" }
    val reservados = unidades.count { it.estado?.uppercase() == "RESERVADO" }
    val pctOcup    = (ocupados.toFloat() / total * 100).toInt()

    val totalRecaudado = tasas.filter { it.estadoPago.uppercase() == "PAGADO" }.sumOf { it.importe }
    val totalImpagado  = tasas.filter { it.estadoPago.uppercase() != "PAGADO" }.sumOf { it.importe }

    CementerioBackground {
        Column(modifier = Modifier.fillMaxSize()) {

            // Cabecera
            Box(modifier = Modifier.fillMaxWidth()
                .background(Brush.verticalGradient(listOf(NavyMid, NavyDeep)))
                .padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, null, tint = GoldPrimary)
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text("ESTADÍSTICAS", style = MaterialTheme.typography.labelSmall,
                            color = GoldPrimary, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
                        Text("Analítica en tiempo real",
                            style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                    }
                    if (cargando) CircularProgressIndicator(
                        Modifier.size(20.dp), color = GoldPrimary, strokeWidth = 2.dp)
                }
            }

            Column(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(0.dp)) {

                Spacer(Modifier.height(16.dp))

                // ── KPIs con contadores animados ──────────────────────────────
                Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    KpiAnimado("$pctOcup%",   "Ocupación",   NichoOcupado,   Modifier.weight(1f))
                    KpiAnimado("$ocupados",   "Ocupados",    NichoOcupado,   Modifier.weight(1f))
                    KpiAnimado("$libres",     "Libres",      NichoLibre,     Modifier.weight(1f))
                    KpiAnimado("$caducados",  "Caducados",   NichoCaducado,  Modifier.weight(1f))
                }

                Spacer(Modifier.height(16.dp))

                // ── Gráfico circular de ocupación ─────────────────────────────
                GoldBorderCard(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
                    Column(modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Icon(Icons.Default.PieChart, null, tint = GoldPrimary,
                                modifier = Modifier.size(20.dp))
                            Text("Distribución de nichos",
                                style = MaterialTheme.typography.titleMedium,
                                color = TextPrimary, fontWeight = FontWeight.SemiBold)
                        }
                        HorizontalDivider(color = BorderSubtle)

                        if (!cargando && unidades.isNotEmpty()) {
                            AndroidView(
                                factory = { ctx ->
                                    PieChart(ctx).apply {
                                        layoutParams = ViewGroup.LayoutParams(
                                            ViewGroup.LayoutParams.MATCH_PARENT, 400)
                                        description.isEnabled = false
                                        isDrawHoleEnabled = true
                                        holeRadius = 50f
                                        transparentCircleRadius = 55f
                                        setHoleColor(AndroidColor.TRANSPARENT)
                                        setTransparentCircleColor(AndroidColor.TRANSPARENT)
                                        setDrawEntryLabels(false)
                                        setUsePercentValues(true)
                                        legend.apply {
                                            isEnabled = true
                                            textColor = AndroidColor.WHITE
                                            form = Legend.LegendForm.CIRCLE
                                        }
                                        centerText = "$pctOcup%\nOcupación"
                                        setCenterTextColor(AndroidColor.WHITE)
                                        setCenterTextSize(16f)

                                        val entries = listOf(
                                            PieEntry(ocupados.toFloat(),  "Ocupados"),
                                            PieEntry(libres.toFloat(),    "Libres"),
                                            PieEntry(caducados.toFloat(), "Caducados"),
                                            PieEntry(reservados.toFloat(),"Reservados"),
                                        ).filter { it.value > 0 }

                                        val colors = listOf(
                                            NichoOcupado.toArgb(),
                                            NichoLibre.toArgb(),
                                            NichoCaducado.toArgb(),
                                            NichoReservado.toArgb()
                                        )
                                        val ds = PieDataSet(entries, "").apply {
                                            this.colors = colors
                                            valueTextColor = AndroidColor.WHITE
                                            valueTextSize = 12f
                                        }
                                        ds.valueFormatter = PercentFormatter(this)
                                        data = PieData(ds)
                                        invalidate()
                                        animateY(1000)
                                    }
                                },
                                modifier = Modifier.fillMaxWidth().height(220.dp)
                            )
                        } else {
                            Box(Modifier.fillMaxWidth().height(220.dp),
                                contentAlignment = Alignment.Center) {
                                if (cargando) CircularProgressIndicator(color = GoldPrimary)
                                else Text("Sin datos", color = TextSecondary)
                            }
                        }

                        // Leyenda manual
                        Row(modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceEvenly) {
                            listOf(
                                Triple("Ocupados",  NichoOcupado,  ocupados),
                                Triple("Libres",    NichoLibre,    libres),
                                Triple("Caducados", NichoCaducado, caducados),
                                Triple("Reservados",NichoReservado,reservados),
                            ).forEach { (label, color, count) ->
                                Column(horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.spacedBy(3.dp)) {
                                    Box(Modifier.size(10.dp).clip(CircleShape).background(color))
                                    Text("$count", style = MaterialTheme.typography.labelLarge,
                                        color = color, fontWeight = FontWeight.Bold)
                                    Text(label, style = MaterialTheme.typography.labelSmall,
                                        color = TextDisabled)
                                }
                            }
                        }
                    }
                }

                Spacer(Modifier.height(16.dp))

                // ── Panel económico ───────────────────────────────────────────
                GoldBorderCard(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
                    Column(modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Icon(Icons.Default.Euro, null, tint = GoldPrimary,
                                modifier = Modifier.size(20.dp))
                            Text("Resumen económico",
                                style = MaterialTheme.typography.titleMedium,
                                color = TextPrimary, fontWeight = FontWeight.SemiBold)
                        }
                        HorizontalDivider(color = BorderSubtle)

                        Row(modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            // Recaudado
                            Column(modifier = Modifier.weight(1f)) {
                                Text("Recaudado", style = MaterialTheme.typography.labelMedium, color = TextSecondary)
                                Text("${"%.2f".format(totalRecaudado)}€",
                                    style = MaterialTheme.typography.headlineSmall, color = Color(0xFF4CAF50), fontWeight = FontWeight.Bold)
                            }
                            // Pendiente
                            Column(modifier = Modifier.weight(1f)) {
                                Text("Pendiente", style = MaterialTheme.typography.labelMedium, color = TextSecondary)
                                Text("${"%.2f".format(totalImpagado)}€",
                                    style = MaterialTheme.typography.headlineSmall, color = Color(0xFFF44336), fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }

                Spacer(Modifier.height(16.dp))

                // ── Restos huérfanos ─────────────────────────────────────────
                GoldBorderCard(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
                    Column(modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Icon(Icons.Default.History, null, tint = GoldPrimary,
                                modifier = Modifier.size(20.dp))
                            Text("Restos sin asignar",
                                style = MaterialTheme.typography.titleMedium,
                                color = TextPrimary, fontWeight = FontWeight.SemiBold)
                        }
                        HorizontalDivider(color = BorderSubtle)

                        if (huerfanos.isEmpty() && !cargando) {
                            Text("No hay restos pendientes de asignación",
                                style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
                        } else {
                            Text("Se han detectado ${huerfanos.size} registros de restos que no están vinculados a ninguna unidad actual.",
                                style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
                        }
                    }
                }

                Spacer(Modifier.height(32.dp))
            }
        }
    }
}

@Composable
fun KpiAnimado(valor: String, etiqueta: String, color: Color, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = NavyDeep),
        border = BorderStroke(1.dp, color.copy(alpha = 0.3f))
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(valor, style = MaterialTheme.typography.titleLarge,
                color = color, fontWeight = FontWeight.ExtraBold)
            Text(etiqueta, style = MaterialTheme.typography.labelSmall,
                color = TextSecondary, fontSize = 10.sp)
        }
    }
}
