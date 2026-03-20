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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.*
import com.corrales.cementerio.data.model.TasaResponse
import com.corrales.cementerio.data.repository.CementerioRepository
import com.corrales.cementerio.ui.components.*
import com.corrales.cementerio.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun TasasApiScreen(onBack: () -> Unit = {}) {
    val scope     = rememberCoroutineScope()
    var tasas     by remember { mutableStateOf<List<TasaResponse>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var soloImpagos by remember { mutableStateOf(true) }
    var mensaje   by remember { mutableStateOf("") }

    fun cargar() {
        scope.launch {
            isLoading = true
            if (soloImpagos) CementerioRepository.getTasasImpagadas().onSuccess { tasas = it }
            else CementerioRepository.getTodasTasas().onSuccess { tasas = it }
            isLoading = false
        }
    }

    LaunchedEffect(soloImpagos) { cargar() }

    CementerioBackground {
        Column(modifier = Modifier.fillMaxSize()) {
            // Header
            Box(modifier = Modifier.fillMaxWidth().background(NavyMid).padding(20.dp)) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, null, tint = GoldPrimary) }
                        Column(modifier = Modifier.weight(1f)) {
                            Text("GESTIÓN ECONÓMICA", style = MaterialTheme.typography.labelSmall, color = GoldPrimary, fontWeight = FontWeight.Bold, letterSpacing = 1.5.sp)
                            Text("${tasas.size} tasas", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                        }
                    }
                    // Toggle Solo impagos / Todas
                    Row(
                        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp))
                            .background(SurfaceCard).padding(4.dp),
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        listOf(true to "Impagadas", false to "Todas").forEach { (opcion, label) ->
                            Box(
                                modifier = Modifier.weight(1f)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(if (soloImpagos == opcion) if (opcion) AlertRed.copy(0.2f) else GoldPrimary.copy(0.2f) else Color.Transparent)
                                    .clickable { soloImpagos = opcion }
                                    .padding(vertical = 10.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    label,
                                    style = MaterialTheme.typography.labelLarge,
                                    color = if (soloImpagos == opcion) (if (opcion) AlertRed else GoldPrimary) else TextSecondary,
                                    fontWeight = if (soloImpagos == opcion) FontWeight.Bold else FontWeight.Normal
                                )
                            }
                        }
                    }
                }
            }

            if (mensaje.isNotBlank()) {
                Row(modifier = Modifier.fillMaxWidth().background(AlertGreen.copy(0.15f)).padding(12.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.CheckCircle, null, tint = AlertGreen, modifier = Modifier.size(18.dp))
                    Text(mensaje, style = MaterialTheme.typography.bodySmall, color = AlertGreen)
                }
            }

            when {
                isLoading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = GoldPrimary)
                }
                tasas.isEmpty() -> Box(Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Icon(Icons.Default.CheckCircle, null, tint = AlertGreen, modifier = Modifier.size(56.dp))
                        Text("¡Sin impagos pendientes!", style = MaterialTheme.typography.titleMedium, color = AlertGreen)
                    }
                }
                else -> LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(bottom = 100.dp)
                ) {
                    items(tasas, key = { it.id ?: it.hashCode() }) { tasa ->
                        TasaCard(tasa, onPagar = {
                            scope.launch {
                                CementerioRepository.procesarPago(tasa.id ?: return@launch)
                                    .onSuccess { mensaje = "✓ Pago registrado para \${tasa.concepto}"; cargar() }
                            }
                        })
                    }
                }
            }
        }
    }
}

@Composable
fun TasaCard(tasa: TasaResponse, onPagar: () -> Unit) {
    val estadoColor = when (tasa.estadoPago.uppercase()) {
        "PAGADO"    -> AlertGreen
        "IMPAGO"    -> AlertRed
        "PENDIENTE" -> AlertAmber
        else        -> TextSecondary
    }

    GoldBorderCard(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 5.dp)) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(tasa.concepto, style = MaterialTheme.typography.titleMedium, color = TextPrimary, fontWeight = FontWeight.Bold)
                    Text(tasa.titular?.nombreApellidos ?: "Sin titular", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                }
                Text("%.2f €".format(tasa.importe), style = MaterialTheme.typography.titleMedium, color = AlertGreen, fontWeight = FontWeight.Bold)
            }
            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier.clip(RoundedCornerShape(6.dp))
                        .background(estadoColor.copy(0.15f)).padding(horizontal = 8.dp, vertical = 3.dp)
                ) {
                    Text(tasa.estadoPago, style = MaterialTheme.typography.labelSmall, color = estadoColor, fontWeight = FontWeight.Bold)
                }
                Spacer(Modifier.width(8.dp))
                Text("Emisión: ${tasa.fechaEmision}", style = MaterialTheme.typography.labelSmall, color = TextDisabled)
                Spacer(Modifier.weight(1f))
                if (tasa.estadoPago.uppercase() != "PAGADO") {
                    Button(
                        onClick = onPagar,
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = AlertGreen, contentColor = NavyDeep),
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
                    ) {
                        Icon(Icons.Default.CreditCard, null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Pagar", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
