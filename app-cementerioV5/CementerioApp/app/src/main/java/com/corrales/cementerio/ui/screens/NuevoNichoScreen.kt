package com.corrales.cementerio.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.corrales.cementerio.data.model.*
import com.corrales.cementerio.data.repository.CementerioRepository
import com.corrales.cementerio.ui.components.*
import com.corrales.cementerio.ui.theme.*
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter

/**
 * Pantalla de registro de nueva inhumación.
 *
 * Flujo real contra la API (en orden):
 *  1. POST /api/titulares          → crea o reutiliza el titular/concesionario
 *  2. POST /api/restos             → registra el difunto como "huérfano" inicialmente
 *  3. PUT  /api/restos/{id}/vincular/{unidadId} → lo ubica en el nicho elegido
 *  4. PUT  /api/unidades/{id}      → cambia estado del nicho a "Ocupado"
 *  5. POST /api/concesiones        → crea el contrato de concesión vinculando titular + unidad
 *
 * Si el usuario no selecciona un nicho existente el resto queda en la
 * Bandeja de Regularización (unidad_id = null) para ubicarlo después en campo.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NuevoNichoScreen(onBack: () -> Unit = {}, onGuardar: () -> Unit = {}) {
    val scope = rememberCoroutineScope()

    // ── Estado del formulario ──────────────────────────────────────────────────
    // Difunto
    var nombreDifunto    by remember { mutableStateOf("") }
    var apellidosDifunto by remember { mutableStateOf("") }
    var fechaDefuncion   by remember { mutableStateOf("") }
    var fechaInhumacion  by remember { mutableStateOf("") }
    var procedencia      by remember { mutableStateOf("") }
    var notasHistoricas  by remember { mutableStateOf("") }

    // Ubicación (nicho existente)
    var unidadIdInput    by remember { mutableStateOf("") }  // ID del nicho real en la BD
    var tipoSelec        by remember { mutableStateOf(TipoUnidad.NICHO) }

    // Titular / concesión
    var nombreTitular    by remember { mutableStateOf("") }
    var apellidosTitular by remember { mutableStateOf("") }
    var dniTitular       by remember { mutableStateOf("") }
    var telefonoTitular  by remember { mutableStateOf("") }
    var emailTitular     by remember { mutableStateOf("") }
    var fechaInicio      by remember { mutableStateOf("") }
    var duracionAnos     by remember { mutableIntStateOf(10) }

    // UI state
    var isLoading        by remember { mutableStateOf(false) }
    var errorMsg         by remember { mutableStateOf("") }
    var mostrarExito     by remember { mutableStateOf(false) }
    var resumenExito     by remember { mutableStateOf("") }
    var pasoActual       by remember { mutableIntStateOf(0) }  // para mostrar progreso

    val duraciones = listOf(5, 10, 25, 50, 99)
    val fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd")
    val fmtDisplay = DateTimeFormatter.ofPattern("dd/MM/yyyy")

    // ── Validación ─────────────────────────────────────────────────────────────
    val difuntoValido = nombreDifunto.isNotBlank() && apellidosDifunto.isNotBlank() && fechaDefuncion.isNotBlank()
    val titularValido = nombreTitular.isNotBlank() && apellidosTitular.isNotBlank()
    val formularioValido = difuntoValido

    // ── Función principal de guardado ──────────────────────────────────────────
    fun guardarEnApi() {
        scope.launch {
            isLoading = true
            errorMsg = ""
            pasoActual = 0

            try {
                // ── Parsear fecha de inhumación ──────────────────────────────
                val fechaInhum = if (fechaInhumacion.isNotBlank()) {
                    try {
                        // Acepta DD/MM/AAAA o AAAA-MM-DD
                        if (fechaInhumacion.contains("/")) {
                            LocalDate.parse(fechaInhumacion, fmtDisplay).format(fmt)
                        } else fechaInhumacion
                    } catch (e: Exception) { LocalDate.now().format(fmt) }
                } else LocalDate.now().format(fmt)

                val fechaDef = if (fechaDefuncion.isNotBlank()) {
                    try {
                        if (fechaDefuncion.contains("/")) {
                            LocalDate.parse(fechaDefuncion, fmtDisplay).format(fmt)
                        } else fechaDefuncion
                    } catch (e: Exception) { LocalDate.now().format(fmt) }
                } else LocalDate.now().format(fmt)

                // ── PASO 1: Crear titular (solo si se han rellenado sus datos) ──
                var titularId: Int? = null
                if (titularValido) {
                    pasoActual = 1
                    val titularResult = CementerioRepository.guardarTitular(
                        TitularRequest(
                            nombreApellidos = "$nombreTitular $apellidosTitular".trim(),
                            documento = dniTitular.ifBlank { null },
                            telefono  = telefonoTitular.ifBlank { null },
                            email     = emailTitular.ifBlank { null }
                        )
                    )
                    titularResult.onFailure {
                        errorMsg = "Error al guardar titular: ${it.message}"
                        isLoading = false
                        return@launch
                    }
                    titularId = titularResult.getOrNull()?.id
                }

                // ── PASO 2: Crear el registro de restos (difunto) ──────────────
                pasoActual = 2
                val restosResult = CementerioRepository.crearResto(
                    RestosRequest(
                        nombreApellidos = "$nombreDifunto $apellidosDifunto".trim(),
                        fechaInhumacion = fechaInhum,
                        procedencia     = procedencia.ifBlank { null },
                        notasHistoricas = notasHistoricas.ifBlank { null }
                    )
                )
                restosResult.onFailure {
                    errorMsg = "Error al registrar difunto: ${it.message}"
                    isLoading = false
                    return@launch
                }
                val restoCreado = restosResult.getOrNull()!!
                var textoResumen = "✓ Difunto registrado (ID: ${restoCreado.id})"

                // ── PASO 3: Vincular al nicho si se especificó un ID ───────────
                val unidadId = unidadIdInput.trim().toIntOrNull()
                if (unidadId != null) {
                    pasoActual = 3
                    val vincularResult = CementerioRepository.vincularResto(restoCreado.id!!, unidadId)
                    vincularResult.onSuccess {
                        textoResumen += "\n✓ Vinculado al nicho #$unidadId"
                    }.onFailure {
                        // No bloqueamos: el resto queda huérfano y se ubica en campo
                        textoResumen += "\n⚠ No se pudo vincular al nicho. Quedará en Bandeja de Regularización."
                    }

                    // ── PASO 4: Cambiar estado del nicho a Ocupado ─────────────
                    pasoActual = 4
                    CementerioRepository.actualizarEstadoUnidad(unidadId, "Ocupado")
                        .onSuccess { textoResumen += "\n✓ Estado del nicho actualizado a Ocupado" }
                        .onFailure { textoResumen += "\n⚠ No se pudo actualizar estado del nicho" }

                    // ── PASO 5: Crear concesión si hay titular y fechas ─────────
                    if (titularId != null && fechaInicio.isNotBlank()) {
                        pasoActual = 5
                        val inicio = try {
                            if (fechaInicio.contains("/"))
                                LocalDate.parse(fechaInicio, fmtDisplay).format(fmt)
                            else fechaInicio
                        } catch (e: Exception) { LocalDate.now().format(fmt) }

                        val vencimiento = try {
                            LocalDate.parse(inicio, fmt).plusYears(duracionAnos.toLong()).format(fmt)
                        } catch (e: Exception) {
                            LocalDate.now().plusYears(duracionAnos.toLong()).format(fmt)
                        }

                        CementerioRepository.crearConcesion(
                            ConcesionRequest(
                                unidadEnterramiento = IdWrapper(unidadId),
                                titular             = IdWrapper(titularId),
                                fechaInicio         = inicio,
                                fechaVencimiento    = vencimiento,
                                estado              = "Vigente"
                            )
                        ).onSuccess { textoResumen += "\n✓ Concesión creada (vence $vencimiento)" }
                         .onFailure { textoResumen += "\n⚠ No se pudo crear la concesión: ${it.message}" }
                    }
                } else {
                    textoResumen += "\n📋 Sin nicho asignado — aparecerá en Bandeja de Regularización"
                }

                resumenExito = textoResumen
                mostrarExito = true

            } catch (e: Exception) {
                errorMsg = "Error inesperado: ${e.message}"
            } finally {
                isLoading = false
                pasoActual = 0
            }
        }
    }

    // ── UI ────────────────────────────────────────────────────────────────────
    Scaffold(
        topBar = {
            CementerioTopBar(
                title = "Nueva Inhumación",
                subtitle = "Registro en base de datos",
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, null, tint = GoldPrimary)
                    }
                }
            )
        },
        bottomBar = {
            Column(
                modifier = Modifier.fillMaxWidth().background(NavyDeep)
                    .padding(horizontal = 20.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Error
                AnimatedVisibility(visible = errorMsg.isNotBlank()) {
                    Row(
                        modifier = Modifier.fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(AlertRed.copy(0.12f))
                            .border(1.dp, AlertRed.copy(0.4f), RoundedCornerShape(10.dp))
                            .padding(10.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.ErrorOutline, null, tint = AlertRed, modifier = Modifier.size(16.dp))
                        Text(errorMsg, style = MaterialTheme.typography.bodySmall, color = AlertRed)
                    }
                }

                // Indicador de progreso de pasos
                AnimatedVisibility(visible = isLoading) {
                    val pasoLabel = when (pasoActual) {
                        1 -> "Guardando titular..."
                        2 -> "Registrando difunto..."
                        3 -> "Vinculando al nicho..."
                        4 -> "Actualizando estado del nicho..."
                        5 -> "Creando concesión..."
                        else -> "Procesando..."
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(GoldPrimary.copy(0.12f))
                            .padding(10.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            color = GoldPrimary,
                            strokeWidth = 2.dp
                        )
                        Text(pasoLabel, style = MaterialTheme.typography.bodySmall, color = GoldPrimary)
                    }
                }

                Button(
                    onClick = { guardarEnApi() },
                    modifier = Modifier.fillMaxWidth().height(56.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = GoldPrimary, contentColor = NavyDeep),
                    enabled = formularioValido && !isLoading
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), color = NavyDeep, strokeWidth = 2.dp)
                    } else {
                        Icon(Icons.Default.Save, null, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Guardar en base de datos", fontWeight = FontWeight.Bold,
                            style = MaterialTheme.typography.labelLarge)
                    }
                }
            }
        },
        containerColor = NavyDeep
    ) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Spacer(Modifier.height(4.dp))

            // ── Banner informativo sobre el flujo ─────────────────────────────
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(NichoOcupado.copy(0.1f))
                    .border(1.dp, NichoOcupado.copy(0.3f), RoundedCornerShape(12.dp))
                    .padding(12.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.Top
            ) {
                Icon(Icons.Default.Info, null, tint = NichoOcupado, modifier = Modifier.size(18.dp))
                Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                    Text("Flujo de guardado", style = MaterialTheme.typography.labelLarge,
                        color = NichoOcupado, fontWeight = FontWeight.Bold)
                    Text(
                        "1. Titular  →  2. Difunto  →  3. Vincular nicho  →  4. Estado Ocupado  →  5. Concesión",
                        style = MaterialTheme.typography.bodySmall, color = TextSecondary
                    )
                    Text(
                        "Si no asignas ID de nicho, el difunto queda en la Bandeja de Regularización.",
                        style = MaterialTheme.typography.bodySmall, color = TextDisabled
                    )
                }
            }

            // ── Sección 1: Datos del difunto ──────────────────────────────────
            FormSection("Datos del Difunto *", Icons.Default.Person, NichoOcupado) {
                FormField("Nombre *", nombreDifunto, { nombreDifunto = it }, "Ej: María")
                FormField("Apellidos *", apellidosDifunto, { apellidosDifunto = it }, "Ej: García Hernández")
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    FormField("Fecha defunción *", fechaDefuncion, { fechaDefuncion = it },
                        "DD/MM/AAAA", Modifier.weight(1f))
                    FormField("Fecha inhumación", fechaInhumacion, { fechaInhumacion = it },
                        "DD/MM/AAAA", Modifier.weight(1f))
                }
                FormField("Procedencia", procedencia, { procedencia = it }, "Ej: Hospital, domicilio...")
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Notas históricas", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                    OutlinedTextField(
                        value = notasHistoricas,
                        onValueChange = { notasHistoricas = it },
                        placeholder = { Text("Anotaciones del libro, tachaduras detectadas...", color = TextDisabled) },
                        minLines = 2,
                        shape = RoundedCornerShape(12.dp),
                        colors = cementerioFieldColors(),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }

            // ── Sección 2: Ubicación (ID del nicho) ───────────────────────────
            FormSection("Ubicación en el Cementerio", Icons.Default.LocationOn, GoldPrimary) {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("ID del nicho", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                    OutlinedTextField(
                        value = unidadIdInput,
                        onValueChange = { unidadIdInput = it.filter { c -> c.isDigit() } },
                        placeholder = { Text("Número ID del nicho en la BD (ej: 42)", color = TextDisabled) },
                        leadingIcon = {
                            Icon(Icons.Default.GridView, null, tint = GoldPrimary, modifier = Modifier.size(20.dp))
                        },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        shape = RoundedCornerShape(12.dp),
                        colors = cementerioFieldColors(),
                        modifier = Modifier.fillMaxWidth()
                    )
                    // Hint sobre dónde ver el ID
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(SurfaceSunken)
                            .padding(horizontal = 10.dp, vertical = 6.dp)
                    ) {
                        Icon(Icons.Default.Lightbulb, null, tint = AlertAmber, modifier = Modifier.size(14.dp))
                        Text(
                            "Encuentra el ID en Mapa → Bloque → toca el nicho. Déjalo vacío para ubicar después en campo.",
                            style = MaterialTheme.typography.labelSmall,
                            color = TextDisabled
                        )
                    }
                }
                // Tipo de unidad
                Text("Tipo de unidad", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.horizontalScroll(rememberScrollState())
                ) {
                    TipoUnidad.entries.forEach { tipo ->
                        FilterChipCustom(
                            selected = tipoSelec == tipo,
                            label = tipo.label,
                            onClick = { tipoSelec = tipo }
                        )
                    }
                }
            }

            // ── Sección 3: Titular / concesión ────────────────────────────────
            FormSection("Titular y Concesión (opcional)", Icons.Default.Badge, AlertGreen) {
                Row(
                    modifier = Modifier.fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(AlertGreen.copy(0.08f))
                        .padding(10.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Info, null, tint = AlertGreen, modifier = Modifier.size(14.dp))
                    Text(
                        "Si rellenas estos campos se creará automáticamente la concesión en la BD.",
                        style = MaterialTheme.typography.labelSmall, color = TextSecondary
                    )
                }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    FormField("Nombre", nombreTitular, { nombreTitular = it }, "Nombre", Modifier.weight(1f))
                    FormField("Apellidos", apellidosTitular, { apellidosTitular = it }, "Apellidos", Modifier.weight(1f))
                }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    FormField("DNI/NIF", dniTitular, { dniTitular = it }, "12345678A", Modifier.weight(1f))
                    FormField("Teléfono", telefonoTitular, { telefonoTitular = it }, "+34 600...",
                        Modifier.weight(1f), KeyboardType.Phone)
                }
                FormField("Email", emailTitular, { emailTitular = it }, "correo@email.com",
                    keyboardType = KeyboardType.Email)
                FormField("Fecha inicio concesión", fechaInicio, { fechaInicio = it }, "DD/MM/AAAA")

                // Selector duración rápida
                Text("Duración de la concesión", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                Spacer(Modifier.height(4.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    duraciones.forEach { anos ->
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(10.dp))
                                .background(if (duracionAnos == anos) AlertGreen.copy(0.2f) else SurfaceCard)
                                .border(1.dp, if (duracionAnos == anos) AlertGreen else BorderSubtle, RoundedCornerShape(10.dp))
                                .clickable { duracionAnos = anos }
                                .padding(horizontal = 10.dp, vertical = 8.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                "$anos años",
                                style = MaterialTheme.typography.labelLarge,
                                color = if (duracionAnos == anos) AlertGreen else TextSecondary,
                                fontWeight = if (duracionAnos == anos) FontWeight.Bold else FontWeight.Normal
                            )
                        }
                    }
                }
            }

            Spacer(Modifier.height(80.dp))
        }
    }

    // ── Diálogo de éxito con resumen detallado ────────────────────────────────
    if (mostrarExito) {
        AlertDialog(
            onDismissRequest = {},
            containerColor = NavyMid,
            icon = {
                Icon(Icons.Default.CheckCircle, null, tint = AlertGreen, modifier = Modifier.size(44.dp))
            },
            title = {
                Text("¡Registro completado!", color = TextPrimary, fontWeight = FontWeight.Bold)
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        "$nombreDifunto $apellidosDifunto",
                        style = MaterialTheme.typography.titleMedium,
                        color = GoldPrimary,
                        fontWeight = FontWeight.Bold
                    )
                    HorizontalDivider(color = BorderSubtle)
                    resumenExito.split("\n").forEach { linea ->
                        if (linea.isNotBlank()) {
                            val color = when {
                                linea.startsWith("✓") -> AlertGreen
                                linea.startsWith("⚠") -> AlertAmber
                                linea.startsWith("📋") -> NichoPendiente
                                else -> TextSecondary
                            }
                            Text(linea, style = MaterialTheme.typography.bodySmall, color = color)
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = { mostrarExito = false; onGuardar() },
                    colors = ButtonDefaults.buttonColors(containerColor = GoldPrimary, contentColor = NavyDeep)
                ) {
                    Text("Ver expediente", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { mostrarExito = false; onBack() }) {
                    Text("Volver", color = TextSecondary)
                }
            }
        )
    }
}
