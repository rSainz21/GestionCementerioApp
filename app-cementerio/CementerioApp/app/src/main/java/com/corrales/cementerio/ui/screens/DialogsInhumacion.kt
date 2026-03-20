package com.corrales.cementerio.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.corrales.cementerio.data.model.*
import androidx.compose.ui.graphics.vector.ImageVector
import com.corrales.cementerio.data.repository.CementerioRepository
import com.corrales.cementerio.ui.components.*
import com.corrales.cementerio.ui.theme.*
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter

// ═══════════════════════════════════════════════════════════════════════════════
// DIÁLOGO — REGISTRAR INHUMACIÓN EN UN NICHO LIBRE
// Flujo: POST /api/restos  →  PUT /api/restos/{id}/vincular/{unidadId}
//         →  PUT /api/unidades/{id} estado=Ocupado
//         →  POST /api/movimientos  tipoMovimiento="Inhumación"
// ═══════════════════════════════════════════════════════════════════════════════
@Composable
fun DialogInhumarEnNicho(
    unidadId: Int,
    codigoNicho: String,
    onDismiss: () -> Unit,
    onGuardado: () -> Unit
) {
    val scope = rememberCoroutineScope()
    val fmt   = DateTimeFormatter.ofPattern("yyyy-MM-dd")
    val fmtD  = DateTimeFormatter.ofPattern("dd/MM/yyyy")

    var nombre        by remember { mutableStateOf("") }
    var apellidos     by remember { mutableStateOf("") }
    var fechaInhum    by remember { mutableStateOf("") }
    var procedencia   by remember { mutableStateOf("") }
    var notas         by remember { mutableStateOf("") }
    var isLoading     by remember { mutableStateOf(false) }
    var pasoMsg       by remember { mutableStateOf("") }
    var errorMsg      by remember { mutableStateOf("") }
    var resultMsg     by remember { mutableStateOf("") }
    var isSuccess     by remember { mutableStateOf(false) }

    val valido = nombre.isNotBlank() && apellidos.isNotBlank()

    AlertDialog(
        onDismissRequest = { if (!isLoading) onDismiss() },
        containerColor = NavyMid,
        icon = { Icon(Icons.Default.Add, null, tint = NichoOcupado, modifier = Modifier.size(32.dp)) },
        title = {
            Column {
                Text("Registrar Inhumación", color = TextPrimary, fontWeight = FontWeight.Bold)
                Text("Nicho: $codigoNicho", style = MaterialTheme.typography.bodySmall, color = GoldPrimary)
            }
        },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Nombre y apellidos
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("Nombre *", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                        OutlinedTextField(value = nombre, onValueChange = { nombre = it; errorMsg = "" },
                            placeholder = { Text("Nombre", color = TextDisabled) }, singleLine = true,
                            shape = RoundedCornerShape(10.dp), colors = cementerioFieldColors(),
                            modifier = Modifier.fillMaxWidth())
                    }
                    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("Apellidos *", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                        OutlinedTextField(value = apellidos, onValueChange = { apellidos = it; errorMsg = "" },
                            placeholder = { Text("Apellidos", color = TextDisabled) }, singleLine = true,
                            shape = RoundedCornerShape(10.dp), colors = cementerioFieldColors(),
                            modifier = Modifier.fillMaxWidth())
                    }
                }
                // Fecha
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Fecha inhumación", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                    OutlinedTextField(value = fechaInhum, onValueChange = { fechaInhum = it },
                        placeholder = { Text("DD/MM/AAAA  (vacío = hoy)", color = TextDisabled) },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        shape = RoundedCornerShape(10.dp), colors = cementerioFieldColors(),
                        modifier = Modifier.fillMaxWidth())
                }
                // Procedencia
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Procedencia", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                    OutlinedTextField(value = procedencia, onValueChange = { procedencia = it },
                        placeholder = { Text("Hospital, domicilio, traslado...", color = TextDisabled) },
                        singleLine = true, shape = RoundedCornerShape(10.dp),
                        colors = cementerioFieldColors(), modifier = Modifier.fillMaxWidth())
                }
                // Notas
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Notas históricas", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                    OutlinedTextField(value = notas, onValueChange = { notas = it },
                        placeholder = { Text("Anotaciones del libro, tachaduras...", color = TextDisabled) },
                        minLines = 2, shape = RoundedCornerShape(10.dp),
                        colors = cementerioFieldColors(), modifier = Modifier.fillMaxWidth())
                }
                // Progreso
                AnimatedVisibility(visible = pasoMsg.isNotBlank()) {
                    Row(modifier = Modifier.fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp)).background(GoldPrimary.copy(0.1f)).padding(10.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically) {
                        CircularProgressIndicator(modifier = Modifier.size(14.dp), color = GoldPrimary, strokeWidth = 2.dp)
                        Text(pasoMsg, style = MaterialTheme.typography.bodySmall, color = GoldPrimary)
                    }
                }
                // Resultado
                AnimatedVisibility(visible = resultMsg.isNotBlank()) {
                    Column(modifier = Modifier.fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(if (isSuccess) AlertGreen.copy(0.1f) else AlertRed.copy(0.1f))
                        .padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        resultMsg.split("\n").forEach { linea ->
                            if (linea.isNotBlank()) {
                                val c = when { linea.startsWith("✓") -> AlertGreen; linea.startsWith("✗") -> AlertRed; else -> TextSecondary }
                                Text(linea, style = MaterialTheme.typography.bodySmall, color = c)
                            }
                        }
                    }
                }
                if (errorMsg.isNotBlank()) {
                    Text(errorMsg, style = MaterialTheme.typography.labelSmall, color = AlertRed)
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (!valido) { errorMsg = "Nombre y apellidos son obligatorios"; return@Button }
                    isLoading = true; errorMsg = ""; resultMsg = ""
                    scope.launch {
                        val fechaParsed = if (fechaInhum.isNotBlank()) {
                            try {
                                if (fechaInhum.contains("/")) LocalDate.parse(fechaInhum, fmtD).format(fmt)
                                else fechaInhum
                            } catch (e: Exception) { LocalDate.now().format(fmt) }
                        } else LocalDate.now().format(fmt)

                        var resumen = ""

                        // PASO 1: Crear registro de restos
                        pasoMsg = "Registrando difunto..."
                        val restosResult = CementerioRepository.crearResto(RestosRequest(
                            nombreApellidos = "$nombre $apellidos".trim(),
                            fechaInhumacion = fechaParsed,
                            procedencia     = procedencia.ifBlank { null },
                            notasHistoricas = notas.ifBlank { null }
                        ))
                        restosResult.onFailure {
                            resumen += "✗ Error al crear difunto: ${it.message}\n"
                            resultMsg = resumen.trim(); isSuccess = false; isLoading = false; pasoMsg = ""; return@launch
                        }
                        val restoId = restosResult.getOrNull()?.id ?: run {
                            resultMsg = "✗ No se obtuvo ID del difunto"; isSuccess = false; isLoading = false; pasoMsg = ""; return@launch
                        }
                        resumen += "✓ Difunto registrado (ID: $restoId)\n"

                        // PASO 2: Vincular al nicho
                        pasoMsg = "Vinculando al nicho..."
                        CementerioRepository.vincularResto(restoId, unidadId)
                            .onSuccess { resumen += "✓ Vinculado al nicho $codigoNicho\n" }
                            .onFailure { resumen += "⚠ No se pudo vincular: ${it.message}\n" }

                        // PASO 3: Cambiar estado del nicho a Ocupado
                        pasoMsg = "Actualizando estado del nicho..."
                        CementerioRepository.actualizarEstadoUnidad(unidadId, "Ocupado")
                            .onSuccess { resumen += "✓ Estado del nicho → Ocupado\n" }
                            .onFailure { resumen += "⚠ No se pudo actualizar estado: ${it.message}\n" }

                        // PASO 4: Registrar movimiento de Inhumación
                        pasoMsg = "Registrando movimiento..."
                        CementerioRepository.registrarMovimiento(MovimientoRequest(
                            resto           = IdWrapper(restoId),
                            tipoMovimiento  = "Inhumación",
                            fechaMovimiento = fechaParsed,
                            destino         = IdWrapper(unidadId),
                            notas           = "Inhumación en $codigoNicho"
                        )).onSuccess { resumen += "✓ Movimiento de Inhumación registrado\n" }
                          .onFailure { resumen += "⚠ No se pudo registrar movimiento: ${it.message}\n" }

                        pasoMsg = ""
                        resultMsg = resumen.trim()
                        isSuccess = true
                        isLoading = false
                    }
                },
                enabled = valido && !isLoading && !isSuccess,
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = NichoOcupado, contentColor = Color.White)
            ) {
                if (isLoading) CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                else { Icon(Icons.Default.Save, null, modifier = Modifier.size(16.dp)); Spacer(Modifier.width(4.dp)); Text("Inhumar", fontWeight = FontWeight.Bold) }
            }
        },
        dismissButton = {
            TextButton(onClick = {
                if (!isLoading) { if (isSuccess) onGuardado() else onDismiss() }
            }) { Text(if (isSuccess) "Cerrar y actualizar" else "Cancelar", color = TextSecondary) }
        }
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIÁLOGO — REGISTRAR TRASLADO DESDE UN NICHO OCUPADO
// Flujo: buscar restos del nicho  →  POST /api/movimientos tipoMovimiento="Traslado"
//         →  PUT /api/restos/{id}/vincular/{destinoId}
//         →  PUT /api/unidades/{origen} estado=Libre
//         →  PUT /api/unidades/{destino} estado=Ocupado
// ═══════════════════════════════════════════════════════════════════════════════
@Composable
fun DialogTrasladarDesdeNicho(
    unidadOrigenId: Int,
    codigoNicho: String,
    onDismiss: () -> Unit,
    onGuardado: () -> Unit
) {
    val scope = rememberCoroutineScope()
    val fmt   = DateTimeFormatter.ofPattern("yyyy-MM-dd")

    var destinoId     by remember { mutableStateOf("") }
    var restoIdInput  by remember { mutableStateOf("") }
    var tipoTraslado  by remember { mutableStateOf("Traslado") }
    var notas         by remember { mutableStateOf("") }
    var isLoading     by remember { mutableStateOf(false) }
    var pasoMsg       by remember { mutableStateOf("") }
    var errorMsg      by remember { mutableStateOf("") }
    var resultMsg     by remember { mutableStateOf("") }
    var isSuccess     by remember { mutableStateOf(false) }

    val tiposTraslado = listOf("Traslado", "Exhumación", "Reducción de restos")

    AlertDialog(
        onDismissRequest = { if (!isLoading) onDismiss() },
        containerColor = NavyMid,
        icon = { Icon(Icons.Default.SwapHoriz, null, tint = AlertAmber, modifier = Modifier.size(32.dp)) },
        title = {
            Column {
                Text("Registrar Traslado", color = TextPrimary, fontWeight = FontWeight.Bold)
                Text("Origen: $codigoNicho", style = MaterialTheme.typography.bodySmall, color = AlertAmber)
            }
        },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Tipo de traslado
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("Tipo de operación", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                    tiposTraslado.forEach { tipo ->
                        val sel = tipoTraslado == tipo
                        Row(modifier = Modifier.fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (sel) AlertAmber.copy(0.15f) else SurfaceCard)
                            .border(1.dp, if (sel) AlertAmber else BorderSubtle, RoundedCornerShape(8.dp))
                            .clickable { tipoTraslado = tipo }
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            Icon(if (sel) Icons.Default.RadioButtonChecked else Icons.Default.RadioButtonUnchecked,
                                null, tint = if (sel) AlertAmber else TextSecondary, modifier = Modifier.size(18.dp))
                            Text(tipo, style = MaterialTheme.typography.labelLarge,
                                color = if (sel) AlertAmber else TextPrimary,
                                fontWeight = if (sel) FontWeight.Bold else FontWeight.Normal)
                        }
                    }
                }

                // ID del resto a trasladar
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("ID del difunto/resto", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                    OutlinedTextField(value = restoIdInput,
                        onValueChange = { restoIdInput = it.filter { c -> c.isDigit() }; errorMsg = "" },
                        placeholder = { Text("ID del registro de restos en BD", color = TextDisabled) },
                        leadingIcon = { Icon(Icons.Default.Person, null, tint = AlertAmber, modifier = Modifier.size(18.dp)) },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        shape = RoundedCornerShape(10.dp), colors = cementerioFieldColors(),
                        modifier = Modifier.fillMaxWidth())
                    Text("Encuéntralo en el expediente del nicho o en Regularización",
                        style = MaterialTheme.typography.labelSmall, color = TextDisabled)
                }

                // ID del nicho destino (solo para Traslado)
                AnimatedVisibility(visible = tipoTraslado == "Traslado" || tipoTraslado == "Reducción de restos") {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("ID del nicho destino", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                        OutlinedTextField(value = destinoId,
                            onValueChange = { destinoId = it.filter { c -> c.isDigit() }; errorMsg = "" },
                            placeholder = { Text("ID del nicho de destino", color = TextDisabled) },
                            leadingIcon = { Icon(Icons.Default.GridView, null, tint = NichoLibre, modifier = Modifier.size(18.dp)) },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            shape = RoundedCornerShape(10.dp), colors = cementerioFieldColors(),
                            modifier = Modifier.fillMaxWidth())
                    }
                }

                // Notas
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Notas del traslado", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                    OutlinedTextField(value = notas, onValueChange = { notas = it },
                        placeholder = { Text("Motivo del traslado, autorización...", color = TextDisabled) },
                        minLines = 2, shape = RoundedCornerShape(10.dp),
                        colors = cementerioFieldColors(), modifier = Modifier.fillMaxWidth())
                }

                // Progreso
                AnimatedVisibility(visible = pasoMsg.isNotBlank()) {
                    Row(modifier = Modifier.fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp)).background(AlertAmber.copy(0.1f)).padding(10.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically) {
                        CircularProgressIndicator(modifier = Modifier.size(14.dp), color = AlertAmber, strokeWidth = 2.dp)
                        Text(pasoMsg, style = MaterialTheme.typography.bodySmall, color = AlertAmber)
                    }
                }
                // Resultado
                AnimatedVisibility(visible = resultMsg.isNotBlank()) {
                    Column(modifier = Modifier.fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(if (isSuccess) AlertGreen.copy(0.1f) else AlertRed.copy(0.1f))
                        .padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        resultMsg.split("\n").forEach { linea ->
                            if (linea.isNotBlank()) {
                                val c = when { linea.startsWith("✓") -> AlertGreen; linea.startsWith("✗") -> AlertRed; else -> TextSecondary }
                                Text(linea, style = MaterialTheme.typography.bodySmall, color = c)
                            }
                        }
                    }
                }
                if (errorMsg.isNotBlank()) Text(errorMsg, style = MaterialTheme.typography.labelSmall, color = AlertRed)
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val restoId = restoIdInput.toIntOrNull()
                    if (restoId == null) { errorMsg = "Introduce el ID del difunto"; return@Button }
                    if ((tipoTraslado == "Traslado" || tipoTraslado == "Reducción de restos") && destinoId.toIntOrNull() == null) {
                        errorMsg = "Introduce el ID del nicho destino"; return@Button
                    }
                    val destino = destinoId.toIntOrNull()
                    isLoading = true; errorMsg = ""; resultMsg = ""

                    scope.launch {
                        val hoy = LocalDate.now().format(fmt)
                        var resumen = ""

                        // PASO 1: Registrar movimiento
                        pasoMsg = "Registrando movimiento..."
                        CementerioRepository.registrarMovimiento(MovimientoRequest(
                            resto           = IdWrapper(restoId),
                            tipoMovimiento  = tipoTraslado,
                            fechaMovimiento = hoy,
                            origen          = IdWrapper(unidadOrigenId),
                            destino         = destino?.let { IdWrapper(it) },
                            notas           = notas.ifBlank { "$tipoTraslado desde $codigoNicho" }
                        )).onSuccess { resumen += "✓ Movimiento '$tipoTraslado' registrado\n" }
                          .onFailure { resumen += "✗ Error al registrar movimiento: ${it.message}\n"; resultMsg = resumen.trim(); isSuccess = false; isLoading = false; pasoMsg = ""; return@launch }

                        // PASO 2: Vincular resto al nuevo nicho (si hay destino)
                        if (destino != null) {
                            pasoMsg = "Vinculando resto al nicho destino..."
                            CementerioRepository.vincularResto(restoId, destino)
                                .onSuccess { resumen += "✓ Resto vinculado al nicho destino #$destino\n" }
                                .onFailure { resumen += "⚠ No se pudo vincular al destino: ${it.message}\n" }

                            // PASO 3: Nicho destino → Ocupado
                            pasoMsg = "Actualizando estado nicho destino..."
                            CementerioRepository.actualizarEstadoUnidad(destino, "Ocupado")
                                .onSuccess { resumen += "✓ Nicho destino → Ocupado\n" }
                                .onFailure { resumen += "⚠ No se actualizó estado destino\n" }
                        }

                        // PASO 4: Nicho origen → Libre
                        pasoMsg = "Liberando nicho de origen..."
                        val nuevoEstadoOrigen = if (tipoTraslado == "Exhumación") "Libre" else "Libre"
                        CementerioRepository.actualizarEstadoUnidad(unidadOrigenId, nuevoEstadoOrigen)
                            .onSuccess { resumen += "✓ Nicho origen ($codigoNicho) → Libre\n" }
                            .onFailure { resumen += "⚠ No se actualizó estado del origen\n" }

                        pasoMsg = ""
                        resultMsg = resumen.trim()
                        isSuccess = true
                        isLoading = false
                    }
                },
                enabled = restoIdInput.isNotBlank() && !isLoading && !isSuccess,
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = AlertAmber, contentColor = NavyDeep)
            ) {
                if (isLoading) CircularProgressIndicator(modifier = Modifier.size(16.dp), color = NavyDeep, strokeWidth = 2.dp)
                else { Icon(Icons.Default.SwapHoriz, null, modifier = Modifier.size(16.dp)); Spacer(Modifier.width(4.dp)); Text("Confirmar traslado", fontWeight = FontWeight.Bold) }
            }
        },
        dismissButton = {
            TextButton(onClick = { if (!isLoading) { if (isSuccess) onGuardado() else onDismiss() } }) {
                Text(if (isSuccess) "Cerrar y actualizar" else "Cancelar", color = TextSecondary)
            }
        }
    )
}

