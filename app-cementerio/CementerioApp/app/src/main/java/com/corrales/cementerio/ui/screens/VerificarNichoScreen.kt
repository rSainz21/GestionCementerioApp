package com.corrales.cementerio.ui.screens

import androidx.compose.animation.AnimatedVisibility
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.corrales.cementerio.data.model.*
import com.corrales.cementerio.data.repository.CementerioRepository
import com.corrales.cementerio.ui.components.*
import com.corrales.cementerio.ui.theme.*
import kotlinx.coroutines.launch

/**
 * Pantalla de Verificación de Nicho — la función más usada por operarios en campo.
 * Acceso directo desde la barra de navegación inferior.
 *
 * Permite:
 *  - Buscar un nicho por código o escanear QR
 *  - Ver su estado actual
 *  - Cambiar estado (Libre/Ocupado/Caducado/Reservado/Pendiente)
 *  - Fotografiar la lápida
 *  - Registrar discrepancias
 *  - Acceder al expediente completo
 */
@Composable
fun VerificarNichoScreen(
    onVerExpediente: (Int) -> Unit = {},
    onNavegar: (String) -> Unit = {}
) {
    val scope = rememberCoroutineScope()

    var query           by remember { mutableStateOf("") }
    var unidadActual    by remember { mutableStateOf<UnidadResponse?>(null) }
    var buscando        by remember { mutableStateOf(false) }
    var errorMsg        by remember { mutableStateOf("") }
    var mensajeExito    by remember { mutableStateOf("") }
    var cambiandoEstado by remember { mutableStateOf(false) }
    var mostrarCambioEstado by remember { mutableStateOf(false) }

    fun buscarNicho(codigo: String) {
        if (codigo.isBlank()) return
        buscando = true; errorMsg = ""; unidadActual = null
        scope.launch {
            CementerioRepository.listarTodasUnidades()
                .onSuccess { lista ->
                    val encontrado = lista.find {
                        it.codigo?.equals(codigo.trim(), ignoreCase = true) == true
                    }
                    if (encontrado != null) unidadActual = encontrado
                    else errorMsg = "Nicho $codigo no encontrado"
                }
                .onFailure { errorMsg = "Error de conexión: ${it.message}" }
            buscando = false
        }
    }

    fun cambiarEstado(nuevoEstado: String) {
        val uid = unidadActual?.id ?: return
        cambiandoEstado = true
        scope.launch {
            CementerioRepository.actualizarEstadoUnidad(uid, nuevoEstado)
                .onSuccess {
                    unidadActual = unidadActual?.copy(estado = nuevoEstado)
                    mensajeExito = "✓ Estado actualizado a $nuevoEstado"
                    mostrarCambioEstado = false
                }
                .onFailure { errorMsg = "Error: ${it.message}" }
            cambiandoEstado = false
        }
    }

    val estadoColor = when (unidadActual?.estado?.uppercase()) {
        "OCUPADO"   -> NichoOcupado
        "LIBRE"     -> NichoLibre
        "CADUCADO"  -> NichoCaducado
        "RESERVADO" -> NichoReservado
        else        -> NichoPendiente
    }

    CementerioBackground {
        Column(modifier = Modifier.fillMaxSize()) {

            // ── Cabecera ──────────────────────────────────────────────────────
            Box(modifier = Modifier.fillMaxWidth().background(NavyMid)
                .padding(horizontal = 20.dp, vertical = 16.dp)) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("VERIFICAR NICHO", style = MaterialTheme.typography.labelSmall,
                                color = GoldPrimary, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
                            Text("Comprobación en campo · Operarios",
                                style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                        }
                        // Botón cámara/escáner
                        IconButton(
                            onClick = { onNavegar("camara/CAMPO") },
                            modifier = Modifier.clip(RoundedCornerShape(12.dp))
                                .background(GoldPrimary.copy(0.2f))
                        ) {
                            Icon(Icons.Default.QrCodeScanner, null, tint = GoldPrimary)
                        }
                    }
                    // Campo de búsqueda por código
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically) {
                        OutlinedTextField(
                            value = query,
                            onValueChange = { query = it.uppercase(); errorMsg = "" },
                            placeholder = { Text("Código del nicho (ej: SJ-F1-N5)", color = TextDisabled) },
                            leadingIcon = { Icon(Icons.Default.Search, null, tint = GoldPrimary) },
                            trailingIcon = {
                                if (query.isNotBlank()) IconButton(onClick = { query = ""; unidadActual = null }) {
                                    Icon(Icons.Default.Clear, null, tint = TextSecondary)
                                }
                            },
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            colors = cementerioFieldColors(),
                            modifier = Modifier.weight(1f)
                        )
                        Button(
                            onClick = { buscarNicho(query) },
                            shape = RoundedCornerShape(12.dp),
                            enabled = query.isNotBlank() && !buscando,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = GoldPrimary, contentColor = NavyDeep)
                        ) {
                            if (buscando) CircularProgressIndicator(
                                Modifier.size(18.dp), color = NavyDeep, strokeWidth = 2.dp)
                            else Icon(Icons.Default.SearchOff.takeIf { errorMsg.isNotBlank() }
                                ?: Icons.Default.Check, null)
                        }
                    }
                }
            }

            // Error
            AnimatedVisibility(visible = errorMsg.isNotBlank()) {
                Row(modifier = Modifier.fillMaxWidth().background(AlertRed.copy(0.1f))
                    .padding(12.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.ErrorOutline, null, tint = AlertRed, modifier = Modifier.size(18.dp))
                    Text(errorMsg, style = MaterialTheme.typography.bodySmall, color = AlertRed)
                }
            }

            // Éxito
            AnimatedVisibility(visible = mensajeExito.isNotBlank()) {
                Row(modifier = Modifier.fillMaxWidth().background(AlertGreen.copy(0.1f))
                    .padding(12.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.CheckCircle, null, tint = AlertGreen, modifier = Modifier.size(18.dp))
                    Text(mensajeExito, style = MaterialTheme.typography.bodySmall, color = AlertGreen,
                        modifier = Modifier.weight(1f))
                    TextButton(onClick = { mensajeExito = "" }) {
                        Text("OK", color = AlertGreen)
                    }
                }
            }

            // ── Contenido ─────────────────────────────────────────────────────
            if (unidadActual == null) {
                // Estado vacío con accesos rápidos
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(20.dp),
                        modifier = Modifier.padding(32.dp)) {
                        Icon(Icons.Default.QrCodeScanner, null,
                            tint = GoldPrimary.copy(0.4f), modifier = Modifier.size(80.dp))
                        Text("Introduce el código del nicho",
                            style = MaterialTheme.typography.titleLarge, color = TextSecondary,
                            fontWeight = FontWeight.Bold)
                        Text("El código está en la lápida o en la Vista de Bloques del Mapa. Formato: BLOQUE-Fx-Ny",
                            style = MaterialTheme.typography.bodyMedium, color = TextDisabled,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center)

                        // Accesos rápidos a tareas de campo
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.fillMaxWidth()) {
                            Text("Otras tareas de campo:",
                                style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                            listOf(
                                Triple(Icons.Default.AssignmentLate, "Regularizar huérfanos", "regularizacion"),
                                Triple(Icons.Default.DirectionsWalk, "Panel de campo completo", "campo"),
                            ).forEach { (icon, label, ruta) ->
                                Row(modifier = Modifier.fillMaxWidth()
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(SurfaceCard)
                                    .border(1.dp, BorderSubtle, RoundedCornerShape(12.dp))
                                    .clickable { onNavegar(ruta) }
                                    .padding(14.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Icon(icon, null, tint = GoldPrimary, modifier = Modifier.size(22.dp))
                                    Text(label, style = MaterialTheme.typography.bodyMedium, color = TextPrimary)
                                    Spacer(Modifier.weight(1f))
                                    Icon(Icons.Default.ChevronRight, null, tint = TextDisabled)
                                }
                            }
                        }
                    }
                }
            } else {
                // Nicho encontrado — panel de acciones
                val unidad = unidadActual!!
                LazyColumn(modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp, bottom = 100.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)) {

                    // Card de identidad del nicho
                    item {
                        GoldBorderCard(modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Box(modifier = Modifier.size(12.dp)
                                        .clip(androidx.compose.foundation.shape.CircleShape)
                                        .background(estadoColor))
                                    Text(unidad.codigo ?: "Nicho ${unidad.id}",
                                        style = MaterialTheme.typography.titleLarge,
                                        color = TextPrimary, fontWeight = FontWeight.Bold)
                                    Spacer(Modifier.weight(1f))
                                    Box(modifier = Modifier
                                        .clip(RoundedCornerShape(50))
                                        .background(estadoColor.copy(0.2f))
                                        .border(1.dp, estadoColor.copy(0.5f), RoundedCornerShape(50))
                                        .padding(horizontal = 12.dp, vertical = 5.dp)) {
                                        Text(unidad.estado?.lowercase()?.replaceFirstChar { it.uppercase() } ?: "—",
                                            style = MaterialTheme.typography.labelMedium,
                                            color = estadoColor, fontWeight = FontWeight.Bold)
                                    }
                                }
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    InfoPill(Icons.Default.GridView, "Fila ${unidad.fila ?: "—"}")
                                    InfoPill(Icons.Default.ViewColumn, "Nº ${unidad.numero ?: "—"}")
                                    InfoPill(Icons.Default.Category, unidad.tipo ?: "Nicho")
                                }
                            }
                        }
                    }

                    // Acciones principales — botones grandes para uso en campo con guantes
                    item {
                        Text("ACCIONES", style = MaterialTheme.typography.labelSmall,
                            color = GoldPrimary, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
                    }

                    // Cambiar estado — la acción más usada
                    item {
                        Button(
                            onClick = { mostrarCambioEstado = !mostrarCambioEstado },
                            modifier = Modifier.fillMaxWidth().height(56.dp),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = estadoColor.copy(0.2f),
                                contentColor   = estadoColor)
                        ) {
                            Icon(Icons.Default.Edit, null, modifier = Modifier.size(22.dp))
                            Spacer(Modifier.width(8.dp))
                            Text("Cambiar estado del nicho", fontWeight = FontWeight.Bold,
                                style = MaterialTheme.typography.titleMedium)
                        }
                    }

                    // Selector de estado desplegable
                    item {
                        AnimatedVisibility(visible = mostrarCambioEstado) {
                            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                listOf(
                                    Triple("Libre",    NichoLibre,     Icons.Default.CheckCircle),
                                    Triple("Ocupado",  NichoOcupado,   Icons.Default.Person),
                                    Triple("Caducado", NichoCaducado,  Icons.Default.Warning),
                                    Triple("Reservado",NichoReservado, Icons.Default.BookmarkAdded),
                                    Triple("Pendiente",NichoPendiente, Icons.Default.Schedule),
                                ).forEach { (estado, color, icon) ->
                                    Row(modifier = Modifier.fillMaxWidth()
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(color.copy(0.15f))
                                        .border(1.dp, color.copy(0.4f), RoundedCornerShape(12.dp))
                                        .clickable { cambiarEstado(estado) }
                                        .padding(14.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                        Icon(icon, null, tint = color, modifier = Modifier.size(22.dp))
                                        Text(estado, style = MaterialTheme.typography.bodyLarge,
                                            color = color, fontWeight = FontWeight.SemiBold)
                                        if (cambiandoEstado) {
                                            Spacer(Modifier.weight(1f))
                                            CircularProgressIndicator(Modifier.size(16.dp),
                                                color = color, strokeWidth = 2.dp)
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Otras acciones
                    item {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            // Fotografiar lápida
                            Button(
                                onClick = { onNavegar("camara/${unidad.codigo ?: "CAMPO"}") },
                                modifier = Modifier.fillMaxWidth().height(52.dp),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = GoldPrimary, contentColor = NavyDeep)
                            ) {
                                Icon(Icons.Default.PhotoCamera, null, modifier = Modifier.size(20.dp))
                                Spacer(Modifier.width(8.dp))
                                Text("Fotografiar lápida", fontWeight = FontWeight.Bold)
                            }

                            // Ver expediente completo
                            OutlinedButton(
                                onClick = { unidad.id?.let { onVerExpediente(it) } },
                                modifier = Modifier.fillMaxWidth().height(52.dp),
                                shape = RoundedCornerShape(12.dp),
                                border = BorderStroke(1.dp, GoldPrimary.copy(0.6f))
                            ) {
                                Icon(Icons.Default.OpenInFull, null, tint = GoldPrimary,
                                    modifier = Modifier.size(20.dp))
                                Spacer(Modifier.width(8.dp))
                                Text("Ver expediente completo", color = GoldPrimary,
                                    fontWeight = FontWeight.Bold)
                            }

                            // Nueva inhumación
                            if (unidad.estado?.uppercase() == "LIBRE" || unidad.estado?.uppercase() == "CADUCADO") {
                                OutlinedButton(
                                    onClick = { onNavegar("nuevo_nicho") },
                                    modifier = Modifier.fillMaxWidth().height(52.dp),
                                    shape = RoundedCornerShape(12.dp),
                                    border = BorderStroke(1.dp, NichoOcupado.copy(0.6f))
                                ) {
                                    Icon(Icons.Default.Add, null, tint = NichoOcupado,
                                        modifier = Modifier.size(20.dp))
                                    Spacer(Modifier.width(8.dp))
                                    Text("Registrar inhumación", color = NichoOcupado,
                                        fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
