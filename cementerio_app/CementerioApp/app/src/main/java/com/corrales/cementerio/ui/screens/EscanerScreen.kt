package com.corrales.cementerio.ui.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.*
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.corrales.cementerio.data.model.*
import com.corrales.cementerio.data.repository.CementerioRepository
import com.corrales.cementerio.ui.components.*
import com.corrales.cementerio.ui.theme.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun EscanerScreen(
    onNichoEncontrado: (Int) -> Unit = {},
    onBack: () -> Unit = {}
) {
    val scope = rememberCoroutineScope()
    var escaneando by remember { mutableStateOf(false) }
    var buscandoApi by remember { mutableStateOf(false) }
    var resultado  by remember { mutableStateOf<UnidadResponse?>(null) }
    var inputManual by remember { mutableStateOf("") }
    var errorMsg   by remember { mutableStateOf("") }

    // Animación del scanner
    val scanOffset by rememberInfiniteTransition(label = "scan").animateFloat(
        initialValue = 0f, targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(2000, easing = LinearEasing), RepeatMode.Reverse),
        label = "scanLine"
    )

    CementerioBackground {
        Column(modifier = Modifier.fillMaxSize()) {
            // Header
            Box(modifier = Modifier.fillMaxWidth().background(NavyMid).padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, null, tint = GoldPrimary) }
                    Column {
                        Text("ESCÁNER DE NICHO", style = MaterialTheme.typography.labelSmall,
                            color = GoldPrimary, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
                        Text("QR · Código de barras · Manual", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                    }
                }
            }

            Column(
                modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp)
            ) {

                // Visor de cámara simulado
                Box(
                    modifier = Modifier.fillMaxWidth().height(280.dp)
                        .clip(RoundedCornerShape(20.dp))
                        .background(Color.Black),
                    contentAlignment = Alignment.Center
                ) {
                    if (escaneando) {
                        // Marco de escáner animado
                        Box(modifier = Modifier.fillMaxSize()) {
                            // Fondo semitransparente
                            Box(modifier = Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.6f)))

                            // Marco central
                            Box(modifier = Modifier.size(200.dp).align(Alignment.Center)) {
                                // Esquinas del marco
                                listOf(
                                    Alignment.TopStart, Alignment.TopEnd,
                                    Alignment.BottomStart, Alignment.BottomEnd
                                ).forEach { alignment ->
                                    Box(modifier = Modifier.size(24.dp).align(alignment).border(3.dp, GoldPrimary, RoundedCornerShape(4.dp)))
                                }
                                // Línea de escáner animada
                                Box(
                                    modifier = Modifier.fillMaxWidth().height(2.dp)
                                        .offset(y = (scanOffset * 196).dp)
                                        .background(Brush.horizontalGradient(listOf(Color.Transparent, GoldPrimary, Color.Transparent)))
                                )
                            }
                            Text("Apunta al código QR del nicho", style = MaterialTheme.typography.bodySmall,
                                color = Color.White.copy(alpha = 0.7f), modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 16.dp))
                        }
                    } else {
                        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Icon(Icons.Default.QrCodeScanner, null, tint = GoldPrimary, modifier = Modifier.size(60.dp))
                            Text("Cámara inactiva", style = MaterialTheme.typography.titleMedium, color = TextSecondary)
                            Text("Pulsa 'Iniciar escáner' para activar", style = MaterialTheme.typography.bodySmall, color = TextDisabled)
                        }
                    }
                }

                // Botón iniciar/detener
                Button(
                    onClick = { escaneando = !escaneando; errorMsg = "" },
                    modifier = Modifier.fillMaxWidth().height(54.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (escaneando) AlertRed else GoldPrimary,
                        contentColor = if (escaneando) Color.White else NavyDeep
                    )
                ) {
                    Icon(if (escaneando) Icons.Default.StopCircle else Icons.Default.QrCodeScanner, null, modifier = Modifier.size(20.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(if (escaneando) "Detener escáner" else "Iniciar escáner", fontWeight = FontWeight.Bold)
                }

                // Divisor
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    HorizontalDivider(modifier = Modifier.weight(1f), color = BorderSubtle)
                    Text("o introduce el código manualmente", style = MaterialTheme.typography.labelSmall, color = TextDisabled)
                    HorizontalDivider(modifier = Modifier.weight(1f), color = BorderSubtle)
                }

                // Entrada manual
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Código del nicho", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = inputManual,
                            onValueChange = { inputManual = it.uppercase(); errorMsg = "" },
                            placeholder = { Text("Ej: SOM-B4-N140", color = TextDisabled) },
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            colors = cementerioFieldColors(),
                            modifier = Modifier.weight(1f)
                        )
                        Button(
                            onClick = {
                                scope.launch {
                                    buscandoApi = true; errorMsg = ""
                                    // Buscar la unidad por código usando la lista de todas
                                    CementerioRepository.listarTodasUnidades()
                                        .onSuccess { lista ->
                                            val encontrada = lista.find {
                                                it.codigo?.equals(inputManual.trim(), ignoreCase = true) == true
                                            }
                                            if (encontrada != null) {
                                                resultado = encontrada; errorMsg = ""
                                            } else {
                                                errorMsg = "Código no encontrado: ${inputManual}"
                                            }
                                        }
                                        .onFailure { errorMsg = it.message ?: "Error de conexión" }
                                    buscandoApi = false
                                }
                            },
                            enabled = !buscandoApi,
                            modifier = Modifier.height(56.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = GoldPrimary, contentColor = NavyDeep)
                        ) {
                            if (buscandoApi) {
                                CircularProgressIndicator(modifier = Modifier.size(24.dp), color = NavyDeep, strokeWidth = 2.dp)
                            } else {
                                Icon(Icons.Default.Search, null)
                            }
                        }
                    }
                    if (errorMsg.isNotBlank()) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Icon(Icons.Default.ErrorOutline, null, tint = AlertRed, modifier = Modifier.size(14.dp))
                            Text(errorMsg, style = MaterialTheme.typography.labelSmall, color = AlertRed)
                        }
                    }
                }
                // Instrucciones de uso
                GoldBorderCard(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Icon(Icons.Default.Info, null, tint = GoldPrimary, modifier = Modifier.size(16.dp))
                            Text("Cómo usar el buscador", style = MaterialTheme.typography.labelLarge, color = TextSecondary, fontWeight = FontWeight.SemiBold)
                        }
                        Text("Introduce el código exacto del nicho (ej: SJ-F1-N5). Los códigos se encuentran en Mapa → Vista de Bloques.",
                            style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                    }
                }

                Spacer(Modifier.height(80.dp))
            }
        }

        // Resultado encontrado - navegar al expediente
        resultado?.let { unidad ->
            androidx.compose.runtime.LaunchedEffect(unidad) {
                unidad.id?.let { onNichoEncontrado(it) }
                resultado = null
            }
        }
    }
}
