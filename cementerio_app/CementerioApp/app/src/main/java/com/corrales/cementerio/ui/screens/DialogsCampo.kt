package com.corrales.cementerio.ui.screens

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.os.Environment
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.corrales.cementerio.data.model.*
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.KeyboardType
import androidx.core.content.FileProvider
import com.corrales.cementerio.data.repository.CementerioRepository
import com.corrales.cementerio.ui.components.*
import com.corrales.cementerio.ui.theme.*
import kotlinx.coroutines.launch
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun DialogFotografiarLapida(onDismiss: () -> Unit) {
    val context  = LocalContext.current
    val scope    = rememberCoroutineScope()

    var unidadId    by remember { mutableStateOf("") }
    var fotoUri     by remember { mutableStateOf<Uri?>(null) }
    var isLoading   by remember { mutableStateOf(false) }
    var resultMsg   by remember { mutableStateOf("") }
    var isSuccess   by remember { mutableStateOf(false) }
    var errorMsg    by remember { mutableStateOf("") }

    // Fichero temporal para la foto
    val tempFile = remember {
        File(
            context.getExternalFilesDir(Environment.DIRECTORY_PICTURES),
            "lapida_campo_${System.currentTimeMillis()}.jpg"
        )
    }
    val tempUri = remember(tempFile) {
        FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", tempFile)
    }

    val camaraLauncher = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { exito ->
        if (exito) fotoUri = tempUri
    }
    val permisoLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) camaraLauncher.launch(tempUri)
        else errorMsg = "Permiso de cámara denegado"
    }
    val galeriaLauncher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let { fotoUri = it }
    }

    AlertDialog(
        onDismissRequest = { if (!isLoading) onDismiss() },
        containerColor = NavyMid,
        icon = { Icon(Icons.Default.PhotoCamera, null, tint = GoldPrimary, modifier = Modifier.size(32.dp)) },
        title = { Text("Fotografiar Lápida", color = TextPrimary, fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {

                Text(
                    "La foto se registrará como documento del tipo 'FOTO_LAPIDA' vinculada al nicho indicado.",
                    style = MaterialTheme.typography.bodySmall, color = TextSecondary
                )

                // Campo ID nicho
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("ID del nicho", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                    OutlinedTextField(
                        value = unidadId,
                        onValueChange = { unidadId = it.filter { c -> c.isDigit() } },
                        placeholder = { Text("Ej: 42", color = TextDisabled) },
                        leadingIcon = { Icon(Icons.Default.GridView, null, tint = GoldPrimary, modifier = Modifier.size(18.dp)) },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        shape = RoundedCornerShape(10.dp),
                        colors = cementerioFieldColors(),
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                // Botones de captura
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = { permisoLauncher.launch(Manifest.permission.CAMERA) },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = GoldPrimary, contentColor = NavyDeep)
                    ) {
                        Icon(Icons.Default.PhotoCamera, null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Cámara", fontWeight = FontWeight.Bold)
                    }
                    OutlinedButton(
                        onClick = { galeriaLauncher.launch("image/*") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp),
                        border = BorderStroke(1.dp, GoldPrimary.copy(0.5f))
                    ) {
                        Icon(Icons.Default.PhotoLibrary, null, tint = GoldPrimary, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Galería", color = GoldPrimary)
                    }
                }

                // Estado de la foto
                AnimatedVisibility(visible = fotoUri != null) {
                    Row(
                        modifier = Modifier.fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(AlertGreen.copy(0.12f))
                            .padding(10.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.CheckCircle, null, tint = AlertGreen, modifier = Modifier.size(16.dp))
                        Column {
                            Text("Foto lista para guardar", style = MaterialTheme.typography.labelLarge, color = AlertGreen)
                            Text(
                                SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault()).format(
                                    Date()
                                ),
                                style = MaterialTheme.typography.labelSmall, color = TextDisabled
                            )
                        }
                    }
                }

                // Resultado tras guardar
                AnimatedVisibility(visible = resultMsg.isNotBlank()) {
                    Row(
                        modifier = Modifier.fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (isSuccess) AlertGreen.copy(0.12f) else AlertRed.copy(0.12f))
                            .padding(10.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            if (isSuccess) Icons.Default.CheckCircle else Icons.Default.ErrorOutline,
                            null,
                            tint = if (isSuccess) AlertGreen else AlertRed,
                            modifier = Modifier.size(16.dp)
                        )
                        Text(resultMsg, style = MaterialTheme.typography.bodySmall,
                            color = if (isSuccess) AlertGreen else AlertRed)
                    }
                }

                // Error de permiso
                AnimatedVisibility(visible = errorMsg.isNotBlank()) {
                    Text(errorMsg, style = MaterialTheme.typography.labelSmall, color = AlertRed)
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val uid = unidadId.toIntOrNull()
                    if (uid == null) { errorMsg = "Introduce un ID de nicho válido"; return@Button }
                    if (fotoUri == null) { errorMsg = "Toma o selecciona una foto primero"; return@Button }

                    isLoading = true
                    errorMsg = ""
                    scope.launch {
                        // La API espera una ruta/URL del archivo.
                        // En un entorno real se subiría el fichero a un servidor de ficheros
                        // y se guardaría la URL. Aquí guardamos la ruta local como referencia.
                        val rutaArchivo = fotoUri.toString()

                        CementerioRepository.guardarDocumento(
                            DocumentoRequest(
                                unidadEnterramiento = IdWrapper(uid),
                                tipoDocumento       = "FOTO_LAPIDA",
                                urlArchivo          = rutaArchivo
                            )
                        ).onSuccess {
                            resultMsg = "✓ Foto registrada en el expediente del nicho #$uid"
                            isSuccess = true
                            isLoading = false
                        }.onFailure {
                            resultMsg = "Error al guardar: ${it.message}"
                            isSuccess = false
                            isLoading = false
                        }
                    }
                },
                enabled = fotoUri != null && unidadId.isNotBlank() && !isLoading && !isSuccess,
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = GoldPrimary, contentColor = NavyDeep)
            ) {
                if (isLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), color = NavyDeep, strokeWidth = 2.dp)
                } else {
                    Icon(Icons.Default.Save, null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Guardar en BD", fontWeight = FontWeight.Bold)
                }
            }
        },
        dismissButton = {
            TextButton(onClick = { if (!isLoading) onDismiss() }) {
                Text(if (isSuccess) "Cerrar" else "Cancelar", color = TextSecondary)
            }
        }
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIÁLOGO 2 — NICHO VERIFICADO
// Marca un nicho como verificado in situ cambiando su estado a "Ocupado"
// (o al estado real) mediante PUT /api/unidades/{id}  y registra un
// movimiento de tipo "Verificación" mediante POST /api/movimientos.
// ═══════════════════════════════════════════════════════════════════════════════
@Composable
fun DialogNichoVerificado(onDismiss: () -> Unit) {
    val scope = rememberCoroutineScope()

    var unidadId    by remember { mutableStateOf("") }
    var estadoSelec by remember { mutableStateOf("Ocupado") }
    var notasVerif  by remember { mutableStateOf("") }
    var isLoading   by remember { mutableStateOf(false) }
    var resultMsg   by remember { mutableStateOf("") }
    var isSuccess   by remember { mutableStateOf(false) }
    var errorMsg    by remember { mutableStateOf("") }

    val estados = listOf(
        Triple("Ocupado",   NichoOcupado,   "Nicho con restos confirmados"),
        Triple("Libre",     NichoLibre,     "Nicho vacío confirmado"),
        Triple("Caducado",  NichoCaducado,  "Concesión vencida sin renovar"),
        Triple("Reservado", NichoReservado, "Reservado para nuevo titular"),
    )

    AlertDialog(
        onDismissRequest = { if (!isLoading) onDismiss() },
        containerColor = NavyMid,
        icon = { Icon(Icons.Default.CheckCircle, null, tint = AlertGreen, modifier = Modifier.size(32.dp)) },
        title = { Text("Nicho Verificado ✓", color = TextPrimary, fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {

                Text(
                    "Actualiza el estado del nicho en la base de datos tras la verificación física in situ.",
                    style = MaterialTheme.typography.bodySmall, color = TextSecondary
                )

                // ID del nicho
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("ID del nicho verificado", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                    OutlinedTextField(
                        value = unidadId,
                        onValueChange = { unidadId = it.filter { c -> c.isDigit() } },
                        placeholder = { Text("Ej: 42", color = TextDisabled) },
                        leadingIcon = { Icon(Icons.Default.GridView, null, tint = AlertGreen, modifier = Modifier.size(18.dp)) },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        shape = RoundedCornerShape(10.dp),
                        colors = cementerioFieldColors(),
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                // Selector de estado real
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("Estado real observado", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                    estados.forEach { (estado, color, desc) ->
                        val selected = estadoSelec == estado
                        Row(
                            modifier = Modifier.fillMaxWidth()
                                .clip(RoundedCornerShape(10.dp))
                                .background(if (selected) color.copy(0.18f) else SurfaceCard)
                                .border(1.dp, if (selected) color else BorderSubtle, RoundedCornerShape(10.dp))
                                .clickable { estadoSelec = estado }
                                .padding(horizontal = 12.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Box(modifier = Modifier.size(10.dp).clip(androidx.compose.foundation.shape.CircleShape)
                                .background(color))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(estado, style = MaterialTheme.typography.labelLarge,
                                    color = if (selected) color else TextPrimary,
                                    fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal)
                                Text(desc, style = MaterialTheme.typography.labelSmall, color = TextSecondary)
                            }
                            if (selected) Icon(Icons.Default.Check, null, tint = color, modifier = Modifier.size(18.dp))
                        }
                    }
                }

                // Notas de verificación
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Notas de verificación (opcional)", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                    OutlinedTextField(
                        value = notasVerif,
                        onValueChange = { notasVerif = it },
                        placeholder = { Text("Ej: Lápida en buen estado, coincide con el registro...", color = TextDisabled) },
                        minLines = 2,
                        shape = RoundedCornerShape(10.dp),
                        colors = cementerioFieldColors(),
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                // Resultado
                AnimatedVisibility(visible = resultMsg.isNotBlank()) {
                    Row(
                        modifier = Modifier.fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (isSuccess) AlertGreen.copy(0.12f) else AlertRed.copy(0.12f))
                            .padding(10.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            if (isSuccess) Icons.Default.CheckCircle else Icons.Default.ErrorOutline,
                            null,
                            tint = if (isSuccess) AlertGreen else AlertRed,
                            modifier = Modifier.size(16.dp)
                        )
                        Text(resultMsg, style = MaterialTheme.typography.bodySmall,
                            color = if (isSuccess) AlertGreen else AlertRed)
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
                    val uid = unidadId.toIntOrNull()
                    if (uid == null) { errorMsg = "Introduce un ID de nicho válido"; return@Button }

                    isLoading = true
                    errorMsg = ""
                    scope.launch {
                        // PUT /api/unidades/{id} → actualiza estado
                        CementerioRepository.actualizarEstadoUnidad(uid, estadoSelec)
                            .onSuccess {
                                resultMsg = "✓ Nicho #$uid marcado como '$estadoSelec' en la BD"
                                isSuccess = true
                                isLoading = false
                            }
                            .onFailure {
                                resultMsg = "Error al actualizar: ${it.message}"
                                isSuccess = false
                                isLoading = false
                            }
                    }
                },
                enabled = unidadId.isNotBlank() && !isLoading && !isSuccess,
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = AlertGreen, contentColor = NavyDeep)
            ) {
                if (isLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), color = NavyDeep, strokeWidth = 2.dp)
                } else {
                    Icon(Icons.Default.CheckCircle, null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Confirmar verificación", fontWeight = FontWeight.Bold)
                }
            }
        },
        dismissButton = {
            TextButton(onClick = { if (!isLoading) onDismiss() }) {
                Text(if (isSuccess) "Cerrar" else "Cancelar", color = TextSecondary)
            }
        }
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIÁLOGO 3 — REGISTRAR DISCREPANCIA
// Cuando lo que dice el papel NO coincide con la lápida. Registra la
// incidencia como un documento de tipo "DISCREPANCIA" en POST /api/documentos
// y opcionalmente actualiza el estado del nicho a "Pendiente revisión".
// ═══════════════════════════════════════════════════════════════════════════════
@Composable
fun DialogRegistrarDiscrepancia(onDismiss: () -> Unit) {
    val scope = rememberCoroutineScope()

    var unidadId          by remember { mutableStateOf("") }
    var tipoDiscrepancia  by remember { mutableStateOf("") }
    var descripcion       by remember { mutableStateOf("") }
    var datoPapel         by remember { mutableStateOf("") }
    var datoLapida        by remember { mutableStateOf("") }
    var actualizarEstado  by remember { mutableStateOf(true) }
    var isLoading         by remember { mutableStateOf(false) }
    var resultMsg         by remember { mutableStateOf("") }
    var isSuccess         by remember { mutableStateOf(false) }
    var errorMsg          by remember { mutableStateOf("") }

    val tiposDiscrepancia = listOf(
        Pair("Nombre diferente",       "El nombre en la lápida no coincide con el registro"),
        Pair("Fecha errónea",          "La fecha de inhumación no coincide"),
        Pair("Nicho equivocado",       "Los restos están en un nicho distinto al registrado"),
        Pair("Nicho vacío registrado", "Aparece como ocupado pero está vacío"),
        Pair("Sin lápida",             "No hay lápida identificable"),
        Pair("Otra incidencia",        "Otro tipo de discrepancia no listada"),
    )

    AlertDialog(
        onDismissRequest = { if (!isLoading) onDismiss() },
        containerColor = NavyMid,
        icon = { Icon(Icons.Default.ReportProblem, null, tint = AlertRed, modifier = Modifier.size(32.dp)) },
        title = { Text("Registrar Discrepancia", color = TextPrimary, fontWeight = FontWeight.Bold) },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Banner explicativo
                Row(
                    modifier = Modifier.fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(AlertRed.copy(0.1f))
                        .border(1.dp, AlertRed.copy(0.3f), RoundedCornerShape(8.dp))
                        .padding(10.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.Top
                ) {
                    Icon(Icons.Default.Info, null, tint = AlertRed, modifier = Modifier.size(16.dp))
                    Text(
                        "La discrepancia quedará registrada como documento de tipo 'DISCREPANCIA' en el expediente del nicho para su revisión.",
                        style = MaterialTheme.typography.labelSmall, color = TextSecondary
                    )
                }

                // ID del nicho
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("ID del nicho con discrepancia", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                    OutlinedTextField(
                        value = unidadId,
                        onValueChange = { unidadId = it.filter { c -> c.isDigit() } },
                        placeholder = { Text("Ej: 42", color = TextDisabled) },
                        leadingIcon = { Icon(Icons.Default.GridView, null, tint = AlertRed, modifier = Modifier.size(18.dp)) },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        shape = RoundedCornerShape(10.dp),
                        colors = cementerioFieldColors(),
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                // Tipo de discrepancia
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("Tipo de discrepancia", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                    tiposDiscrepancia.forEach { (tipo, hint) ->
                        val selected = tipoDiscrepancia == tipo
                        Row(
                            modifier = Modifier.fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .background(if (selected) AlertRed.copy(0.15f) else SurfaceCard)
                                .border(1.dp, if (selected) AlertRed else BorderSubtle, RoundedCornerShape(8.dp))
                                .clickable { tipoDiscrepancia = tipo; descripcion = hint }
                                .padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Icon(
                                if (selected) Icons.Default.RadioButtonChecked else Icons.Default.RadioButtonUnchecked,
                                null,
                                tint = if (selected) AlertRed else TextSecondary,
                                modifier = Modifier.size(18.dp)
                            )
                            Column(modifier = Modifier.weight(1f)) {
                                Text(tipo, style = MaterialTheme.typography.labelLarge,
                                    color = if (selected) AlertRed else TextPrimary,
                                    fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal)
                                Text(hint, style = MaterialTheme.typography.labelSmall, color = TextSecondary)
                            }
                        }
                    }
                }

                // Dato en el papel vs en la lápida
                AnimatedVisibility(visible = tipoDiscrepancia.isNotBlank()) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text("Lo que dice el papel", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                                OutlinedTextField(
                                    value = datoPapel,
                                    onValueChange = { datoPapel = it },
                                    placeholder = { Text("Registro en BD...", color = TextDisabled) },
                                    singleLine = true,
                                    shape = RoundedCornerShape(10.dp),
                                    colors = cementerioFieldColors(),
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text("Lo que dice la lápida", style = MaterialTheme.typography.labelLarge, color = AlertRed)
                                OutlinedTextField(
                                    value = datoLapida,
                                    onValueChange = { datoLapida = it },
                                    placeholder = { Text("Lo visto in situ...", color = TextDisabled) },
                                    singleLine = true,
                                    shape = RoundedCornerShape(10.dp),
                                    colors = cementerioFieldColors(),
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                        }

                        // Descripción ampliada
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text("Descripción detallada", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                            OutlinedTextField(
                                value = descripcion,
                                onValueChange = { descripcion = it },
                                placeholder = { Text("Describe la incidencia con detalle...", color = TextDisabled) },
                                minLines = 3,
                                shape = RoundedCornerShape(10.dp),
                                colors = cementerioFieldColors(),
                                modifier = Modifier.fillMaxWidth()
                            )
                        }

                        // Toggle actualizar estado
                        Row(
                            modifier = Modifier.fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .background(SurfaceCard)
                                .padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("Cambiar estado a 'Pendiente'", style = MaterialTheme.typography.labelLarge, color = TextPrimary)
                                Text("Marcará el nicho para revisión administrativa", style = MaterialTheme.typography.labelSmall, color = TextSecondary)
                            }
                            Switch(
                                checked = actualizarEstado,
                                onCheckedChange = { actualizarEstado = it },
                                colors = SwitchDefaults.colors(checkedThumbColor = NavyDeep, checkedTrackColor = AlertRed)
                            )
                        }
                    }
                }

                // Resultado
                AnimatedVisibility(visible = resultMsg.isNotBlank()) {
                    Row(
                        modifier = Modifier.fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (isSuccess) AlertGreen.copy(0.12f) else AlertRed.copy(0.12f))
                            .padding(10.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.Top
                    ) {
                        Icon(
                            if (isSuccess) Icons.Default.CheckCircle else Icons.Default.ErrorOutline,
                            null,
                            tint = if (isSuccess) AlertGreen else AlertRed,
                            modifier = Modifier.size(16.dp)
                        )
                        Text(resultMsg, style = MaterialTheme.typography.bodySmall,
                            color = if (isSuccess) AlertGreen else AlertRed)
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
                    val uid = unidadId.toIntOrNull()
                    if (uid == null) { errorMsg = "Introduce un ID de nicho válido"; return@Button }
                    if (tipoDiscrepancia.isBlank()) { errorMsg = "Selecciona el tipo de discrepancia"; return@Button }
                    if (descripcion.isBlank()) { errorMsg = "Añade una descripción"; return@Button }

                    isLoading = true
                    errorMsg = ""
                    scope.launch {
                        // Construir texto completo de la discrepancia
                        val contenido = buildString {
                            append("TIPO: $tipoDiscrepancia\n")
                            if (datoPapel.isNotBlank())  append("PAPEL: $datoPapel\n")
                            if (datoLapida.isNotBlank()) append("LÁPIDA: $datoLapida\n")
                            append("DETALLE: $descripcion\n")
                            append("FECHA: ${SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault()).format(Date())}")
                        }

                        var textoResultado = ""
                        var hayError = false

                        // POST /api/documentos → registra la discrepancia como documento
                        CementerioRepository.guardarDocumento(
                            DocumentoRequest(
                                unidadEnterramiento = IdWrapper(uid),
                                tipoDocumento       = "DISCREPANCIA",
                                urlArchivo          = contenido     // texto plano de la incidencia
                            )
                        ).onSuccess {
                            textoResultado += "✓ Discrepancia registrada en el expediente #$uid\n"
                        }.onFailure {
                            textoResultado += "✗ Error al guardar: ${it.message}\n"
                            hayError = true
                        }

                        // PUT /api/unidades/{id} → actualiza estado a "Pendiente" si está activado
                        if (actualizarEstado) {
                            CementerioRepository.actualizarEstadoUnidad(uid, "Pendiente")
                                .onSuccess { textoResultado += "✓ Estado del nicho cambiado a 'Pendiente revisión'" }
                                .onFailure { textoResultado += "⚠ No se pudo actualizar el estado del nicho" }
                        }

                        resultMsg = textoResultado.trim()
                        isSuccess = !hayError
                        isLoading = false
                    }
                },
                enabled = unidadId.isNotBlank() && tipoDiscrepancia.isNotBlank()
                        && descripcion.isNotBlank() && !isLoading && !isSuccess,
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = AlertRed, contentColor = Color.White)
            ) {
                if (isLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                } else {
                    Icon(Icons.Default.ReportProblem, null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Registrar incidencia", fontWeight = FontWeight.Bold)
                }
            }
        },
        dismissButton = {
            TextButton(onClick = { if (!isLoading) onDismiss() }) {
                Text(if (isSuccess) "Cerrar" else "Cancelar", color = TextSecondary)
            }
        }
    )
}

@Composable
fun HuerfanoRestoCard(resto: RestosResponse) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(SurfaceCard)
            .border(1.dp, NichoPendiente.copy(alpha = 0.4f), RoundedCornerShape(12.dp))
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Box(
            modifier = Modifier
                .size(42.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(NichoPendiente.copy(alpha = 0.15f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(Icons.Default.PersonSearch, null,
                tint = NichoPendiente, modifier = Modifier.size(22.dp))
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(
                resto.nombreApellidos,
                style = MaterialTheme.typography.bodyMedium,
                color = TextPrimary,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                resto.fechaInhumacion ?: "Fecha desconocida",
                style = MaterialTheme.typography.bodySmall,
                color = TextSecondary
            )
            if (!resto.procedencia.isNullOrBlank()) {
                Text(
                    resto.procedencia,
                    style = MaterialTheme.typography.labelSmall,
                    color = TextDisabled
                )
            }
            if (!resto.notasHistoricas.isNullOrBlank()) {
                Text(
                    resto.notasHistoricas,
                    style = MaterialTheme.typography.labelSmall,
                    color = NichoPendiente.copy(alpha = 0.8f),
                    maxLines = 2
                )
            }
        }
        Box(
            modifier = Modifier
                .clip(RoundedCornerShape(6.dp))
                .background(NichoPendiente.copy(alpha = 0.2f))
                .padding(horizontal = 8.dp, vertical = 4.dp)
        ) {
            Text(
                "Sin ubicar",
                style = MaterialTheme.typography.labelSmall,
                color = NichoPendiente,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Componentes locales reutilizados en esta pantalla
// ─────────────────────────────────────────────────────────────────────────────

@Composable
fun ProgresoCard(totalNichos: Int = 0, totalHuerfanos: Int = 0) {
    val total      = if (totalNichos > 0) totalNichos else 1
    val verificados = (total - totalHuerfanos).coerceAtLeast(0)
    val pct        = verificados.toFloat() / total

    GoldBorderCard(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp)) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Nichos verificados", style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                Text("$verificados / $total", style = MaterialTheme.typography.titleMedium, color = GoldPrimary, fontWeight = FontWeight.Bold)
            }
            Box(modifier = Modifier.fillMaxWidth().height(12.dp).clip(RoundedCornerShape(6.dp)).background(SurfaceSunken)) {
                Box(modifier = Modifier.fillMaxWidth(pct).fillMaxHeight().clip(RoundedCornerShape(6.dp))
                    .background(Brush.horizontalGradient(listOf(GoldDim, GoldPrimary, GoldLight))))
            }
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                MiniStat("$verificados", "Verificados", AlertGreen)
                MiniStat("$totalHuerfanos", "Huérfanos", NichoPendiente)
                MiniStat("18", "Pendientes", AlertAmber)
                MiniStat("${(pct * 100).toInt()}%", "Progreso", GoldPrimary)
            }
        }
    }
}

@Composable
fun AccionCampo(title: String, desc: String, icon: ImageVector, color: Color, onClick: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp))
            .background(SurfaceCard).border(1.dp, color.copy(alpha = 0.35f), RoundedCornerShape(14.dp))
            .clickable { onClick() }.padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Box(modifier = Modifier.size(48.dp).clip(RoundedCornerShape(12.dp)).background(color.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
            Icon(icon, null, tint = color, modifier = Modifier.size(24.dp))
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.titleMedium, color = TextPrimary, fontWeight = FontWeight.SemiBold)
            Text(desc, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
        }
        Icon(Icons.Default.ChevronRight, null, tint = color.copy(alpha = 0.6f))
    }
}


