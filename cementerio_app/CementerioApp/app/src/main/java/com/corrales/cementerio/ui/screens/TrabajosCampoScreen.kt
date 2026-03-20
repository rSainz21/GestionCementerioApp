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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.corrales.cementerio.data.model.*
import com.corrales.cementerio.data.repository.CementerioRepository
import com.corrales.cementerio.ui.components.*
import com.corrales.cementerio.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun TrabajosCampoScreen(onNavigate: (String) -> Unit = {}) {
    val scope       = rememberCoroutineScope()
    var huerfanos   by remember { mutableStateOf<List<RestosResponse>>(emptyList()) }
    var totalNichos by remember { mutableIntStateOf(0) }
    var cargando    by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        CementerioRepository.getRestosHuerfanos().onSuccess  { huerfanos   = it }
        CementerioRepository.listarTodasUnidades().onSuccess { totalNichos = it.size }
        cargando = false
    }

    var mostrarDialogoFoto         by remember { mutableStateOf(false) }
    var mostrarDialogoVerificado   by remember { mutableStateOf(false) }
    var mostrarDialogoDiscrepancia by remember { mutableStateOf(false) }

    CementerioBackground {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 100.dp)
        ) {

            // ── Banner cabecera ───────────────────────────────────────────────
            item {
                Box(
                    modifier = Modifier.fillMaxWidth()
                        .background(Brush.verticalGradient(
                            listOf(AlertAmber.copy(alpha = 0.15f), Color.Transparent)))
                        .padding(20.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Box(
                                modifier = Modifier.size(40.dp)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(AlertAmber.copy(alpha = 0.2f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.DirectionsWalk, null,
                                    tint = AlertAmber, modifier = Modifier.size(22.dp))
                            }
                            Column {
                                Text("TRABAJO DE CAMPO",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = AlertAmber, fontWeight = FontWeight.Bold,
                                    letterSpacing = 2.sp)
                                Text("Factor crítico del proyecto",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = TextSecondary)
                            }
                        }
                        Text(
                            "La tecnología sola no resuelve el desorden documental. " +
                            "Los operarios deben verificar físicamente cada nicho.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextSecondary
                        )
                    }
                }
            }

            item { SectionHeader("Progreso de Verificación") }
            item { ProgresoCard(totalNichos = totalNichos, totalHuerfanos = huerfanos.size) }
            item { SectionHeader("Herramientas de Campo") }

            // ── Acciones ──────────────────────────────────────────────────────
            item {
                Column(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    AccionCampo(
                        title = "Bandeja de Regularización",
                        desc  = "Ubica registros huérfanos de libros históricos",
                        icon  = Icons.Default.AssignmentLate,
                        color = NichoPendiente
                    ) { onNavigate("regularizacion") }

                    AccionCampo(
                        title = "Fotografiar Lápida",
                        desc  = "Toma foto y la registra como documento del nicho en la BD",
                        icon  = Icons.Default.PhotoCamera,
                        color = GoldPrimary
                    ) { mostrarDialogoFoto = true }

                    AccionCampo(
                        title = "Registrar Discrepancia",
                        desc  = "El papel no coincide con la lápida — anota la incidencia",
                        icon  = Icons.Default.ReportProblem,
                        color = AlertRed
                    ) { mostrarDialogoDiscrepancia = true }

                    AccionCampo(
                        title = "Nicho verificado ✓",
                        desc  = "Marcar nicho como comprobado in situ en la base de datos",
                        icon  = Icons.Default.CheckCircle,
                        color = AlertGreen
                    ) { mostrarDialogoVerificado = true }
                }
            }

            // ── Lista huérfanos ───────────────────────────────────────────────
            item {
                SectionHeader("Registros Sin Ubicar", trailing = {
                    Box(
                        modifier = Modifier.clip(RoundedCornerShape(6.dp))
                            .background(NichoPendiente.copy(alpha = 0.2f))
                            .padding(horizontal = 8.dp, vertical = 3.dp)
                    ) {
                        Text("${huerfanos.size} pendientes",
                            style = MaterialTheme.typography.labelSmall,
                            color = NichoPendiente)
                    }
                })
            }

            if (huerfanos.isEmpty()) {
                item {
                    Box(
                        modifier = Modifier.fillMaxWidth().padding(32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(Icons.Default.CheckCircle, null,
                                tint = AlertGreen, modifier = Modifier.size(48.dp))
                            Text("¡Sin registros huérfanos!",
                                style = MaterialTheme.typography.titleMedium,
                                color = AlertGreen)
                        }
                    }
                }
            } else {
                items(huerfanos) { resto ->
                    HuerfanoRestoCard(resto)
                }
            }
        }

        // ── Diálogos de las 3 herramientas ────────────────────────────────────
        if (mostrarDialogoFoto) {
            DialogFotografiarLapida(onDismiss = { mostrarDialogoFoto = false })
        }
        if (mostrarDialogoVerificado) {
            DialogNichoVerificado(onDismiss = { mostrarDialogoVerificado = false })
        }
        if (mostrarDialogoDiscrepancia) {
            DialogRegistrarDiscrepancia(onDismiss = { mostrarDialogoDiscrepancia = false })
        }
    }
}
