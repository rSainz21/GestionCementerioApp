package com.corrales.cementerio.ui.screens

import android.graphics.Bitmap
import android.graphics.Color as AndroidColor
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
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.*
import com.corrales.cementerio.data.model.*
import com.corrales.cementerio.data.repository.CementerioRepository
import com.corrales.cementerio.ui.components.*
import com.corrales.cementerio.ui.theme.*
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import kotlinx.coroutines.launch

/**
 * Generador de códigos QR para nichos.
 * Genera un QR que al escanearlo muestra el código del nicho.
 * El operario lo imprime y lo pega físicamente en el nicho.
 */
@Composable
fun GenerarQrScreen(onBack: () -> Unit = {}) {
    val scope = rememberCoroutineScope()

    var unidades    by remember { mutableStateOf<List<UnidadResponse>>(emptyList()) }
    var cargando    by remember { mutableStateOf(true) }
    var query       by remember { mutableStateOf("") }
    var qrSeleccionado by remember { mutableStateOf<UnidadResponse?>(null) }
    var qrBitmap    by remember { mutableStateOf<Bitmap?>(null) }

    LaunchedEffect(Unit) {
        CementerioRepository.listarTodasUnidades()
            .onSuccess { unidades = it }
        cargando = false
    }

    val filtradas = unidades.filter {
        query.isBlank() || it.codigo?.contains(query, ignoreCase = true) == true
    }

    fun generarQr(unidad: UnidadResponse) {
        qrSeleccionado = unidad
        val contenido = "CEMENTERIO:${unidad.bloque?.cementerio?.nombre ?: "LOS_CORRALES"}|NICHO:${unidad.codigo}|ID:${unidad.id}"
        try {
            val writer = QRCodeWriter()
            val hints  = mapOf(EncodeHintType.MARGIN to 1)
            val matrix = writer.encode(contenido, BarcodeFormat.QR_CODE, 512, 512, hints)
            val bmp    = Bitmap.createBitmap(512, 512, Bitmap.Config.RGB_565)
            for (x in 0 until 512)
                for (y in 0 until 512)
                    bmp.setPixel(x, y, if (matrix[x, y]) AndroidColor.BLACK else AndroidColor.WHITE)
            qrBitmap = bmp
        } catch (e: Exception) { qrBitmap = null }
    }

    CementerioBackground {
        Column(modifier = Modifier.fillMaxSize()) {

            Box(modifier = Modifier.fillMaxWidth()
                .background(Brush.verticalGradient(listOf(NavyMid, NavyDeep)))
                .padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, null, tint = GoldPrimary)
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text("GENERAR QR DE NICHOS", style = MaterialTheme.typography.labelSmall,
                            color = GoldPrimary, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
                        Text("Imprime y pega en la lápida",
                            style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                    }
                    Icon(Icons.Default.QrCode, null, tint = GoldPrimary,
                        modifier = Modifier.size(28.dp))
                }
            }

            if (qrSeleccionado != null && qrBitmap != null) {
                // Vista del QR generado
                Column(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState())
                    .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(16.dp)) {

                    Text("CÓDIGO QR GENERADO",
                        style = MaterialTheme.typography.labelLarge,
                        color = GoldPrimary, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)

                    // QR con borde decorativo
                    Box(modifier = Modifier
                        .size(280.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(androidx.compose.ui.graphics.Color.White)
                        .border(3.dp, GoldPrimary, RoundedCornerShape(16.dp))
                        .padding(16.dp)) {
                        Image(
                            bitmap = qrBitmap!!.asImageBitmap(),
                            contentDescription = "QR Nicho ${qrSeleccionado!!.codigo}",
                            modifier = Modifier.fillMaxSize()
                        )
                    }

                    // Etiqueta para imprimir
                    Column(modifier = Modifier.fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(SurfaceCard)
                        .border(1.dp, GoldPrimary.copy(0.4f), RoundedCornerShape(12.dp))
                        .padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("Ayuntamiento de Los Corrales de Buelna",
                            style = MaterialTheme.typography.labelSmall, color = TextDisabled)
                        Text(qrSeleccionado!!.codigo ?: "Nicho ${qrSeleccionado!!.id}",
                            style = MaterialTheme.typography.headlineSmall,
                            color = TextPrimary, fontWeight = FontWeight.Bold)
                        Text("Fila ${qrSeleccionado!!.fila ?: "—"} · Posición ${qrSeleccionado!!.numero ?: "—"}",
                            style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
                        Text("Escanea para ver el expediente completo",
                            style = MaterialTheme.typography.labelSmall, color = TextDisabled)
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedButton(
                            onClick = { qrSeleccionado = null; qrBitmap = null },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp),
                            border = BorderStroke(1.dp, BorderSubtle)
                        ) {
                            Icon(Icons.Default.ArrowBack, null, tint = TextSecondary,
                                modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Otro nicho", color = TextSecondary)
                        }
                        Button(
                            onClick = {
                                // Compartir la imagen del QR
                            },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = GoldPrimary, contentColor = NavyDeep)
                        ) {
                            Icon(Icons.Default.Print, null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Imprimir", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            } else {
                // Lista de nichos para seleccionar
                Column(modifier = Modifier.fillMaxSize()) {
                    Box(modifier = Modifier.fillMaxWidth().background(SurfaceCard)
                        .padding(horizontal = 16.dp, vertical = 10.dp)) {
                        SearchField(value = query, onValueChange = { query = it },
                            placeholder = "Buscar nicho por código...")
                    }

                    if (cargando) {
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = GoldPrimary)
                        }
                    } else {
                        LazyColumn(contentPadding = PaddingValues(16.dp, bottom = 100.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            item {
                                Text("Selecciona un nicho para generar su QR",
                                    style = MaterialTheme.typography.bodySmall, color = TextSecondary,
                                    modifier = Modifier.padding(bottom = 8.dp))
                            }
                            items(filtradas.take(50), key = { it.id ?: it.hashCode() }) { u ->
                                val estadoUp = u.estado?.uppercase() ?: "LIBRE"
                                val color = when (estadoUp) {
                                    "OCUPADO" -> NichoOcupado; "LIBRE" -> NichoLibre
                                    "CADUCADO" -> NichoCaducado; else -> NichoPendiente
                                }
                                Row(modifier = Modifier.fillMaxWidth()
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(SurfaceCard)
                                    .border(1.dp, color.copy(0.3f), RoundedCornerShape(10.dp))
                                    .clickable { generarQr(u) }
                                    .padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Box(modifier = Modifier.size(8.dp).clip(
                                        androidx.compose.foundation.shape.CircleShape).background(color))
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(u.codigo ?: "Nicho ${u.id}",
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = TextPrimary, fontWeight = FontWeight.SemiBold)
                                        Text("Fila ${u.fila ?: "—"} · Nº ${u.numero ?: "—"}",
                                            style = MaterialTheme.typography.labelSmall, color = TextSecondary)
                                    }
                                    Icon(Icons.Default.QrCode, null, tint = GoldPrimary,
                                        modifier = Modifier.size(20.dp))
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
