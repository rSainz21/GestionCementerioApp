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

// ═══════════════════════════════════════════════════════════════════════════════
// DIÁLOGO — CREAR NUEVO BLOQUE
// POST /api/bloques  →  (opcional) POST /api/unidades/generar-estructura/{id}
// ═══════════════════════════════════════════════════════════════════════════════
@Composable
fun DialogCrearBloque(
    cementerioId: Int,
    onDismiss: () -> Unit,
    onCreado: (BloqueResponse) -> Unit
) {
    val scope = rememberCoroutineScope()

    var nombre          by remember { mutableStateOf("") }
    var filas           by remember { mutableStateOf("10") }
    var columnas        by remember { mutableStateOf("10") }
    var sentido         by remember { mutableStateOf("horizontal") }
    var generarAuto     by remember { mutableStateOf(true) }
    var isLoading       by remember { mutableStateOf(false) }
    var errorMsg        by remember { mutableStateOf("") }
    var resultMsg       by remember { mutableStateOf("") }
    var isSuccess       by remember { mutableStateOf(false) }
    var bloqueCreado    by remember { mutableStateOf<BloqueResponse?>(null) }

    val totalNichos = (filas.toIntOrNull() ?: 0) * (columnas.toIntOrNull() ?: 0)

    AlertDialog(
        onDismissRequest = { if (!isLoading) onDismiss() },
        containerColor = NavyMid,
        icon = { Icon(Icons.Default.AddBox, null, tint = GoldPrimary, modifier = Modifier.size(32.dp)) },
        title = { Text("Nuevo Bloque de Nichos", color = TextPrimary, fontWeight = FontWeight.Bold) },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {

                // Nombre del bloque
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Nombre del bloque *", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                    OutlinedTextField(
                        value = nombre,
                        onValueChange = { nombre = it; errorMsg = "" },
                        placeholder = { Text("Ej: Bloque Norte, Bloque San José...", color = TextDisabled) },
                        singleLine = true,
                        shape = RoundedCornerShape(10.dp),
                        colors = cementerioFieldColors(),
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                // Filas y columnas
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("Filas", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                        OutlinedTextField(
                            value = filas,
                            onValueChange = { if (it.length <= 3) filas = it.filter { c -> c.isDigit() } },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            shape = RoundedCornerShape(10.dp),
                            colors = cementerioFieldColors(),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("Columnas", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                        OutlinedTextField(
                            value = columnas,
                            onValueChange = { if (it.length <= 3) columnas = it.filter { c -> c.isDigit() } },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            shape = RoundedCornerShape(10.dp),
                            colors = cementerioFieldColors(),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }

                // Vista previa del total
                if (totalNichos > 0) {
                    Row(
                        modifier = Modifier.fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(GoldPrimary.copy(0.1f))
                            .border(1.dp, GoldPrimary.copy(0.3f), RoundedCornerShape(8.dp))
                            .padding(10.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.GridView, null, tint = GoldPrimary, modifier = Modifier.size(18.dp))
                        Column {
                            Text("$totalNichos nichos en total",
                                style = MaterialTheme.typography.labelLarge,
                                color = GoldPrimary, fontWeight = FontWeight.Bold)
                            Text("${filas.ifBlank{"0"}} filas × ${columnas.ifBlank{"0"}} columnas",
                                style = MaterialTheme.typography.labelSmall, color = TextSecondary)
                        }
                    }
                }

                // Sentido de numeración
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("Sentido de numeración", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                    listOf(
                        Pair("horizontal", "De izquierda a derecha, fila por fila"),
                        Pair("vertical",   "De arriba a abajo, columna por columna")
                    ).forEach { (valor, desc) ->
                        val sel = sentido == valor
                        Row(
                            modifier = Modifier.fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .background(if (sel) GoldPrimary.copy(0.15f) else SurfaceCard)
                                .border(1.dp, if (sel) GoldPrimary else BorderSubtle, RoundedCornerShape(8.dp))
                                .clickable { sentido = valor }
                                .padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Icon(
                                if (sel) Icons.Default.RadioButtonChecked else Icons.Default.RadioButtonUnchecked,
                                null, tint = if (sel) GoldPrimary else TextSecondary,
                                modifier = Modifier.size(18.dp)
                            )
                            Column(modifier = Modifier.weight(1f)) {
                                Text(valor.replaceFirstChar { it.uppercase() },
                                    style = MaterialTheme.typography.labelLarge,
                                    color = if (sel) GoldPrimary else TextPrimary,
                                    fontWeight = if (sel) FontWeight.Bold else FontWeight.Normal)
                                Text(desc, style = MaterialTheme.typography.labelSmall, color = TextSecondary)
                            }
                        }
                    }
                }

                // Toggle generar nichos automáticamente
                Row(
                    modifier = Modifier.fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(SurfaceCard)
                        .border(1.dp, if (generarAuto) AlertGreen.copy(0.4f) else BorderSubtle, RoundedCornerShape(10.dp))
                        .padding(horizontal = 14.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Generar nichos automáticamente",
                            style = MaterialTheme.typography.labelLarge,
                            color = if (generarAuto) AlertGreen else TextPrimary,
                            fontWeight = if (generarAuto) FontWeight.Bold else FontWeight.Normal)
                        Text(
                            if (generarAuto) "Se crearán $totalNichos nichos en estado Libre"
                            else "Solo se crea el bloque, sin nichos",
                            style = MaterialTheme.typography.labelSmall, color = TextSecondary
                        )
                    }
                    Switch(
                        checked = generarAuto,
                        onCheckedChange = { generarAuto = it },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = NavyDeep,
                            checkedTrackColor = AlertGreen
                        )
                    )
                }

                // Progreso
                AnimatedVisibility(visible = isLoading) {
                    Row(
                        modifier = Modifier.fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(GoldPrimary.copy(0.1f)).padding(10.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(14.dp), color = GoldPrimary, strokeWidth = 2.dp)
                        Text("Procesando...", style = MaterialTheme.typography.bodySmall, color = GoldPrimary)
                    }
                }

                // Resultado
                AnimatedVisibility(visible = resultMsg.isNotBlank()) {
                    Column(
                        modifier = Modifier.fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (isSuccess) AlertGreen.copy(0.1f) else AlertRed.copy(0.1f))
                            .padding(10.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        resultMsg.split("\n").forEach { linea ->
                            if (linea.isNotBlank()) {
                                val c = when {
                                    linea.startsWith("✓") -> AlertGreen
                                    linea.startsWith("✗") -> AlertRed
                                    else -> TextSecondary
                                }
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
                    if (nombre.isBlank()) { errorMsg = "El nombre es obligatorio"; return@Button }
                    if ((filas.toIntOrNull() ?: 0) <= 0) { errorMsg = "Introduce un número de filas válido"; return@Button }
                    if ((columnas.toIntOrNull() ?: 0) <= 0) { errorMsg = "Introduce un número de columnas válido"; return@Button }

                    isLoading = true; errorMsg = ""; resultMsg = ""
                    scope.launch {
                        var resumen = ""

                        // PASO 1: Crear el bloque
                        val bloqueRequest = BloqueResponse(
                            cementerio       = CementerioResponse(id = cementerioId),
                            nombre           = nombre.trim(),
                            filas            = filas.toInt(),
                            columnas         = columnas.toInt(),
                            sentidoNumeracion = sentido
                        )
                        val bloqueResult = CementerioRepository.crearBloque(bloqueRequest)

                        bloqueResult.onFailure {
                            resultMsg = "✗ Error al crear bloque: ${it.message}"
                            isSuccess = false; isLoading = false; return@launch
                        }

                        val nuevoBloque = bloqueResult.getOrNull()!!
                        bloqueCreado = nuevoBloque
                        resumen += "✓ Bloque '${nombre}' creado (ID: ${nuevoBloque.id})\n"

                        // PASO 2: Generar estructura si está activado
                        if (generarAuto && nuevoBloque.id != null) {
                            CementerioRepository.generarEstructura(nuevoBloque.id)
                                .onSuccess {
                                    resumen += "✓ ${filas.toInt() * columnas.toInt()} nichos generados en estado Libre\n"
                                    resumen += "✓ Listo para usar en la vista de bloques"
                                }
                                .onFailure {
                                    resumen += "⚠ Bloque creado pero no se generaron los nichos: ${it.message}\n"
                                    resumen += "  Usa el botón 'Generar nichos' en la vista de bloques"
                                }
                        } else {
                            resumen += "✓ Bloque creado sin nichos\n"
                            resumen += "  Usa el botón 'Generar nichos' para crearlos"
                        }

                        resultMsg = resumen.trim()
                        isSuccess = true
                        isLoading = false
                    }
                },
                enabled = nombre.isNotBlank() && !isLoading && !isSuccess,
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = GoldPrimary, contentColor = NavyDeep)
            ) {
                if (isLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), color = NavyDeep, strokeWidth = 2.dp)
                } else {
                    Icon(Icons.Default.Save, null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Crear bloque", fontWeight = FontWeight.Bold)
                }
            }
        },
        dismissButton = {
            TextButton(onClick = {
                if (!isLoading) {
                    if (isSuccess) bloqueCreado?.let { onCreado(it) } else onDismiss()
                }
            }) {
                Text(if (isSuccess) "Ver en mapa" else "Cancelar", color = TextSecondary)
            }
        }
    )
}


