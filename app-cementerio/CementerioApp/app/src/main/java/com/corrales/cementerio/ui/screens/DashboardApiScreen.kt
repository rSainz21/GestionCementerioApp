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
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.draw.clip
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

@Composable
fun DashboardApiScreen(
    onNavigate: (String) -> Unit = {},
    onLogout: () -> Unit = {}
) {
    val scope = rememberCoroutineScope()
    var alertas    by remember { mutableStateOf<List<ConcesionResponse>>(emptyList()) }
    var impagos    by remember { mutableStateOf<List<TasaResponse>>(emptyList()) }
    var bloques    by remember { mutableStateOf<List<BloqueResponse>>(emptyList()) }
    var huerfanos  by remember { mutableStateOf(0) }
    var isLoading  by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        scope.launch {
            CementerioRepository.getAlertasCaducidad(6).onSuccess { alertas = it }
            CementerioRepository.getTasasImpagadas().onSuccess { impagos = it }
            CementerioRepository.getRestosHuerfanos().onSuccess { huerfanos = it.size }
            // Cargar bloques del primer cementerio disponible
            CementerioRepository.getCementerios().onSuccess { cems ->
                cems.firstOrNull()?.id?.let { cid ->
                    CementerioRepository.getBloques(cid).onSuccess { bloques = it }
                }
            }
            isLoading = false
        }
    }

    CementerioBackground {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 100.dp)
        ) {
            // ── Header ────────────────────────────────────────────────────────
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Brush.verticalGradient(listOf(NavyMid, NavyDeep)))
                ) {
                    Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 24.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text(
                                    "AYUNTAMIENTO",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = GoldPrimary,
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 2.sp
                                )
                                Text(
                                    "Los Corrales de Buelna",
                                    style = MaterialTheme.typography.displayMedium,
                                    color = TextPrimary,
                                    fontWeight = FontWeight.Bold
                                )
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    modifier = Modifier.padding(top = 4.dp)
                                ) {
                                    Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(AlertGreen))
                                    Text(
                                        "Conectado · ${SessionManager.getUsername()} (${SessionManager.getRol()})",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = TextSecondary
                                    )
                                }
                            }
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Box(
                                    modifier = Modifier
                                        .size(46.dp)
                                        .clip(CircleShape)
                                        .background(GoldPrimary.copy(alpha = 0.12f))
                                        .border(2.dp, GoldPrimary.copy(alpha = 0.5f), CircleShape)
                                        .clickable { onLogout() },
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(Icons.Default.Logout, null, tint = AlertRed, modifier = Modifier.size(20.dp))
                                }
                            }
                        }
                        Spacer(Modifier.height(16.dp))
                        Box(
                            modifier = Modifier.fillMaxWidth().height(1.dp)
                                .background(Brush.horizontalGradient(
                                    listOf(GoldPrimary.copy(alpha = 0.8f), Color.Transparent)
                                ))
                        )
                    }
                }
            }

            // ── KPIs de alertas reales ────────────────────────────────────────
            item {
                SectionHeader("Resumen en tiempo real")
                if (isLoading) {
                    Box(Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = GoldPrimary)
                    }
                } else {
                    Column(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            KpiCard(
                                "Próx. a vencer", "${alertas.size}",
                                { Icon(Icons.Default.Schedule, null, modifier = Modifier.size(22.dp)) },
                                AlertAmber, Modifier.weight(1f)
                            )
                            KpiCard(
                                "Tasas impagadas", "${impagos.size}",
                                { Icon(Icons.Default.MoneyOff, null, modifier = Modifier.size(22.dp)) },
                                AlertRed, Modifier.weight(1f)
                            )
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            KpiCard(
                                "Sin ubicar", "$huerfanos",
                                { Icon(Icons.Default.PersonSearch, null, modifier = Modifier.size(22.dp)) },
                                NichoPendiente, Modifier.weight(1f)
                            )
                            KpiCard(
                                "Bloques activos", "${bloques.size}",
                                { Icon(Icons.Default.GridView, null, modifier = Modifier.size(22.dp)) },
                                GoldPrimary, Modifier.weight(1f)
                            )
                        }
                    }
                }
            }

            // ── Alertas de vencimiento ────────────────────────────────────────
            if (alertas.isNotEmpty()) {
                item { SectionHeader("Concesiones próximas a vencer") }
                items(alertas.take(3)) { concesion ->
                    AlertaConcesionCard(concesion)
                }
                if (alertas.size > 3) {
                    item {
                        TextButton(
                            onClick = { onNavigate("alertas") },
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)
                        ) {
                            Text("Ver todas (${alertas.size})", color = GoldPrimary)
                        }
                    }
                }
            }

            // ── Bloques del cementerio ────────────────────────────────────────
            if (bloques.isNotEmpty()) {
                item {
                    SectionHeader("Bloques del Cementerio", trailing = {
                        TextButton(onClick = { onNavigate("mapa") }) {
                            Text("Ver mapa", color = GoldPrimary, style = MaterialTheme.typography.labelLarge)
                        }
                    })
                }
                items(bloques) { bloque ->
                    BloqueApiCard(bloque) {
                        bloque.id?.let { onNavigate("bloque/$it") }
                    }
                }
            }

            // ── Acciones rápidas ──────────────────────────────────────────────
            item { SectionHeader("Acciones Rápidas") }
            item { AccionesRapidasGrid(onNavigate) }
        }
    }
}

@Composable
fun AlertaConcesionCard(concesion: ConcesionResponse) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(SurfaceCard)
            .border(1.dp, AlertAmber.copy(alpha = 0.3f), RoundedCornerShape(12.dp)),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(modifier = Modifier.width(5.dp).height(70.dp).background(AlertAmber))
        Row(
            modifier = Modifier.weight(1f).padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Box(
                modifier = Modifier.size(38.dp).clip(RoundedCornerShape(10.dp))
                    .background(AlertAmber.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.Schedule, null, tint = AlertAmber, modifier = Modifier.size(20.dp))
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    concesion.unidad?.codigo ?: "Nicho ${concesion.unidad?.id}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextPrimary,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    "Titular: ${concesion.titular?.nombreApellidos ?: "Sin titular"}",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary
                )
                Text(
                    "Vence: ${concesion.fechaVencimiento ?: "—"}",
                    style = MaterialTheme.typography.labelSmall,
                    color = AlertAmber
                )
            }
        }
    }
}

@Composable
fun BloqueApiCard(bloque: BloqueResponse, onClick: () -> Unit) {
    GoldBorderCard(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
        onClick = onClick
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Box(
                modifier = Modifier.size(44.dp).clip(RoundedCornerShape(10.dp))
                    .background(NichoOcupado.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.GridView, null, tint = NichoOcupado, modifier = Modifier.size(22.dp))
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(bloque.nombre, style = MaterialTheme.typography.titleMedium, color = TextPrimary, fontWeight = FontWeight.Bold)
                Text(
                    "${bloque.filas} filas × ${bloque.columnas} columnas · ${bloque.filas * bloque.columnas} nichos",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary
                )
            }
            Icon(Icons.Default.ChevronRight, null, tint = GoldPrimary)
        }
    }
}
