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

@Composable
fun EconomiaApiTab(
    unidad: UnidadResponse,
    concesiones: List<ConcesionResponse>,
    tasas: List<TasaResponse>,
    onPagoRegistrado: () -> Unit,
    onNavegar: (String) -> Unit
) {
    val scope = rememberCoroutineScope()
    var mostrarNuevaTasa     by remember { mutableStateOf(false) }
    var mostrarNuevaConcesion by remember { mutableStateOf(false) }
    var mensajePago          by remember { mutableStateOf("") }
    var procesandoPago       by remember { mutableStateOf(false) }

    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {

        // ── Resumen de la concesión vigente ───────────────────────────────────
        concesiones.firstOrNull { it.estado == "Vigente" }?.let { c ->
            SeccionCard("Concesión Vigente", Icons.Default.Badge) {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    DataRow("Titular",     c.titular?.nombreApellidos ?: "—")
                    DataRow("Inicio",      c.fechaInicio ?: "—")
                    DataRow("Vencimiento", c.fechaVencimiento ?: "—",
                        valueColor = try {
                            if (LocalDate.parse(c.fechaVencimiento).isBefore(
                                    LocalDate.now().plusYears(1))) AlertAmber else TextPrimary
                        } catch (e: Exception) { TextPrimary })
                }
            }
        }

        // ── Lista de tasas reales ─────────────────────────────────────────────
        if (tasas.isNotEmpty()) {
            Text("Tasas económicas", style = MaterialTheme.typography.titleMedium,
                color = TextPrimary, fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(top = 4.dp))
            tasas.forEach { tasa ->
                val estadoColor = when (tasa.estadoPago.uppercase()) {
                    "PAGADO"    -> AlertGreen
                    "IMPAGO"    -> AlertRed
                    "PENDIENTE" -> AlertAmber
                    else        -> TextSecondary
                }
                Row(modifier = Modifier.fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .background(SurfaceCard)
                    .border(1.dp, estadoColor.copy(0.3f), RoundedCornerShape(10.dp))
                    .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(tasa.concepto, style = MaterialTheme.typography.labelLarge,
                            color = TextPrimary, fontWeight = FontWeight.SemiBold)
                        Text(tasa.fechaEmision, style = MaterialTheme.typography.labelSmall, color = TextDisabled)
                    }
                    Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("%.2f €".format(tasa.importe), style = MaterialTheme.typography.titleMedium,
                            color = AlertGreen, fontWeight = FontWeight.Bold)
                        Box(modifier = Modifier.clip(RoundedCornerShape(6.dp))
                            .background(estadoColor.copy(0.15f))
                            .padding(horizontal = 8.dp, vertical = 2.dp)) {
                            Text(tasa.estadoPago, style = MaterialTheme.typography.labelSmall,
                                color = estadoColor, fontWeight = FontWeight.Bold)
                        }
                    }
                    // Botón pagar directamente contra la API
                    if (tasa.estadoPago.uppercase() != "PAGADO") {
                        IconButton(
                            onClick = {
                                procesandoPago = true
                                scope.launch {
                                    CementerioRepository.procesarPago(tasa.id ?: return@launch)
                                        .onSuccess {
                                            mensajePago = "✓ Pago registrado para '${tasa.concepto}'"
                                            onPagoRegistrado()
                                        }
                                        .onFailure { mensajePago = "✗ Error: ${it.message}" }
                                    procesandoPago = false
                                }
                            },
                            enabled = !procesandoPago,
                            modifier = Modifier.size(36.dp).clip(RoundedCornerShape(8.dp))
                                .background(AlertGreen.copy(0.15f))
                        ) {
                            if (procesandoPago)
                                CircularProgressIndicator(Modifier.size(14.dp), color = AlertGreen, strokeWidth = 2.dp)
                            else
                                Icon(Icons.Default.AttachMoney, null, tint = AlertGreen, modifier = Modifier.size(20.dp))
                        }
                    }
                }
            }
        }

        // Mensaje de pago
        AnimatedVisibility(visible = mensajePago.isNotBlank()) {
            Row(modifier = Modifier.fillMaxWidth()
                .clip(RoundedCornerShape(8.dp))
                .background(if (mensajePago.startsWith("✓")) AlertGreen.copy(0.1f) else AlertRed.copy(0.1f))
                .padding(10.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    if (mensajePago.startsWith("✓")) Icons.Default.CheckCircle else Icons.Default.ErrorOutline,
                    null, tint = if (mensajePago.startsWith("✓")) AlertGreen else AlertRed,
                    modifier = Modifier.size(16.dp))
                Text(mensajePago, style = MaterialTheme.typography.bodySmall,
                    color = if (mensajePago.startsWith("✓")) AlertGreen else AlertRed)
            }
        }

        // ── Acciones ──────────────────────────────────────────────────────────
        HorizontalDivider(color = BorderSubtle, modifier = Modifier.padding(vertical = 4.dp))

        listOf(
            Triple("Nueva concesión / titular",       Icons.Default.Badge,        GoldPrimary),
            Triple("Emitir nueva tasa",                Icons.Default.Receipt,      AlertGreen),
            Triple("Iniciar expediente de impago",     Icons.Default.Gavel,        AlertRed),
        ).forEachIndexed { idx, (label, icon, color) ->
            Row(modifier = Modifier.fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
                .background(SurfaceCard)
                .border(1.dp, color.copy(0.3f), RoundedCornerShape(12.dp))
                .clickable {
                    when (idx) {
                        0 -> mostrarNuevaConcesion = true
                        1 -> mostrarNuevaTasa = true
                        2 -> { /* Marcar tasa como IMPAGO: abrir diálogo de nueva tasa con estado IMPAGO */ mostrarNuevaTasa = true }
                    }
                }.padding(14.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Box(modifier = Modifier.size(36.dp).clip(RoundedCornerShape(8.dp))
                    .background(color.copy(0.15f)), contentAlignment = Alignment.Center) {
                    Icon(icon, null, tint = color, modifier = Modifier.size(18.dp))
                }
                Text(label, style = MaterialTheme.typography.bodyMedium,
                    color = TextPrimary, modifier = Modifier.weight(1f))
                Icon(Icons.Default.ChevronRight, null, tint = TextDisabled)
            }
        }
    }

    // Diálogo nueva tasa
    if (mostrarNuevaTasa) {
        DialogNuevaTasa(
            unidadId  = unidad.id ?: 0,
            titularId = concesiones.firstOrNull { it.estado == "Vigente" }?.titular?.id,
            onDismiss = { mostrarNuevaTasa = false },
            onGuardado = { mostrarNuevaTasa = false; onPagoRegistrado() }
        )
    }

    // Ir a pantalla de nueva concesión
    if (mostrarNuevaConcesion) {
        onNavegar("nuevo_titular/${unidad.codigo ?: "nicho"}")
        mostrarNuevaConcesion = false
    }
}

// ─── Diálogo emitir nueva tasa ────────────────────────────────────────────────
@Composable
fun DialogNuevaTasa(
    unidadId: Int,
    titularId: Int?,
    onDismiss: () -> Unit,
    onGuardado: () -> Unit
) {
    val scope   = rememberCoroutineScope()
    val fmt     = DateTimeFormatter.ofPattern("yyyy-MM-dd")
    var concepto   by remember { mutableStateOf("Mantenimiento anual ${LocalDate.now().year}") }
    var importe    by remember { mutableStateOf("48.00") }
    var estado     by remember { mutableStateOf("PENDIENTE") }
    var isLoading  by remember { mutableStateOf(false) }
    var errorMsg   by remember { mutableStateOf("") }
    var isSuccess  by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = { if (!isLoading) onDismiss() },
        containerColor   = NavyMid,
        icon = { Icon(Icons.Default.Receipt, null, tint = AlertGreen, modifier = Modifier.size(32.dp)) },
        title = { Text("Emitir Nueva Tasa", color = TextPrimary, fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Concepto", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                    OutlinedTextField(value = concepto, onValueChange = { concepto = it },
                        singleLine = true, shape = RoundedCornerShape(10.dp),
                        colors = cementerioFieldColors(), modifier = Modifier.fillMaxWidth())
                }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("Importe (€)", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                        OutlinedTextField(value = importe, onValueChange = { importe = it },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            shape = RoundedCornerShape(10.dp), colors = cementerioFieldColors(),
                            modifier = Modifier.fillMaxWidth())
                    }
                    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("Estado inicial", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                        listOf("PENDIENTE", "PAGADO").forEach { op ->
                            Row(modifier = Modifier.clip(RoundedCornerShape(8.dp))
                                .background(if (estado == op) AlertGreen.copy(0.15f) else SurfaceCard)
                                .border(1.dp, if (estado == op) AlertGreen else BorderSubtle, RoundedCornerShape(8.dp))
                                .clickable { estado = op }
                                .padding(8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Icon(if (estado == op) Icons.Default.RadioButtonChecked
                                     else Icons.Default.RadioButtonUnchecked,
                                    null, tint = if (estado == op) AlertGreen else TextSecondary,
                                    modifier = Modifier.size(16.dp))
                                Text(op, style = MaterialTheme.typography.labelSmall,
                                    color = if (estado == op) AlertGreen else TextSecondary)
                            }
                        }
                    }
                }
                if (titularId == null) {
                    Row(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp))
                        .background(AlertAmber.copy(0.1f)).padding(10.dp),
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Warning, null, tint = AlertAmber, modifier = Modifier.size(14.dp))
                        Text("Este nicho no tiene titular. Crea primero una concesión.",
                            style = MaterialTheme.typography.labelSmall, color = AlertAmber)
                    }
                }
                AnimatedVisibility(visible = errorMsg.isNotBlank()) {
                    Text(errorMsg, style = MaterialTheme.typography.labelSmall, color = AlertRed)
                }
                AnimatedVisibility(visible = isSuccess) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.CheckCircle, null, tint = AlertGreen, modifier = Modifier.size(16.dp))
                        Text("Tasa emitida correctamente", style = MaterialTheme.typography.bodySmall, color = AlertGreen)
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val imp = importe.toDoubleOrNull()
                    if (concepto.isBlank()) { errorMsg = "Introduce el concepto"; return@Button }
                    if (imp == null || imp <= 0) { errorMsg = "Importe inválido"; return@Button }
                    if (titularId == null) { errorMsg = "Sin titular: crea una concesión primero"; return@Button }
                    isLoading = true; errorMsg = ""
                    scope.launch {
                        CementerioRepository.crearTasa(TasaRequest(
                            unidad       = IdWrapper(unidadId),
                            titular      = IdWrapper(titularId),
                            concepto     = concepto,
                            importe      = imp,
                            estadoPago   = estado,
                            fechaEmision = LocalDate.now().format(fmt)
                        )).onSuccess { isSuccess = true; isLoading = false }
                          .onFailure { errorMsg = it.message ?: "Error al crear tasa"; isLoading = false }
                    }
                },
                enabled = concepto.isNotBlank() && !isLoading && !isSuccess,
                shape   = RoundedCornerShape(10.dp),
                colors  = ButtonDefaults.buttonColors(containerColor = AlertGreen, contentColor = NavyDeep)
            ) {
                if (isLoading) CircularProgressIndicator(Modifier.size(16.dp), color = NavyDeep, strokeWidth = 2.dp)
                else Text("Emitir tasa", fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = { if (!isLoading) { if (isSuccess) onGuardado() else onDismiss() } }) {
                Text(if (isSuccess) "Cerrar" else "Cancelar", color = TextSecondary)
            }
        }
    )
}
