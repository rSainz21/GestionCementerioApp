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
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.corrales.cementerio.data.model.*
import com.corrales.cementerio.data.repository.CementerioRepository
import com.corrales.cementerio.ui.components.*
import com.corrales.cementerio.ui.theme.*
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter

/**
 * Expediente digital completo de una unidad de enterramiento.
 * Todos los datos vienen de la API en tiempo real.
 * Recibe UnidadResponse (modelo de la API).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NichoDetalleApiScreen(
    unidad: UnidadResponse,
    onBack: () -> Unit = {},
    onNavegar: (String) -> Unit = {}
) {
    val scope = rememberCoroutineScope()
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("Ficha", "Restos", "Documentos", "Economía")

    // Datos cargados desde la API
    // unidadCompleta: la unidad llega con solo el id desde el nav, cargamos el resto aquí
    var unidadCompleta by remember { mutableStateOf(unidad) }
    var concesiones    by remember { mutableStateOf<List<ConcesionResponse>>(emptyList()) }
    var restos         by remember { mutableStateOf<List<RestosResponse>>(emptyList()) }
    var documentos     by remember { mutableStateOf<List<DocumentoResponse>>(emptyList()) }
    var tasas          by remember { mutableStateOf<List<TasaResponse>>(emptyList()) }
    var cargando       by remember { mutableStateOf(true) }

    // Función de recarga — carga TODOS los datos del nicho
    fun recargar() {
        scope.launch {
            cargando = true
            unidad.id?.let { uid ->
                // 1. Cargar la unidad completa (codigo, estado, fila, numero, tipo, bloque)
                CementerioRepository.obtenerUnidad(uid).onSuccess { unidadCompleta = it }
                // 2. Resto de datos
                CementerioRepository.getConcesiones(uid).onSuccess { concesiones = it }
                CementerioRepository.getDocumentos(uid).onSuccess  { documentos  = it }
                CementerioRepository.getTasasPorUnidad(uid).onSuccess { tasas    = it }
                CementerioRepository.getRestosPorUnidad(uid).onSuccess { restos  = it }
            }
            cargando = false
        }
    }

    LaunchedEffect(unidad.id) { recargar() }

    // Usar unidadCompleta (cargada de la API) en lugar del stub que llega del nav
    val estadoUp = unidadCompleta.estado?.uppercase() ?: "LIBRE"
    val colorEstado = when (estadoUp) {
        "OCUPADO"   -> NichoOcupado
        "LIBRE"     -> NichoLibre
        "CADUCADO"  -> NichoCaducado
        "RESERVADO" -> NichoReservado
        else        -> NichoPendiente
    }

    Scaffold(
        topBar = {
            CementerioTopBar(
                title    = unidadCompleta.codigo ?: "Nicho ${unidad.id}",
                subtitle = unidadCompleta.bloque?.nombre ?: "Cargando...",
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, null, tint = GoldPrimary)
                    }
                },
                actions = {
                    IconButton(onClick = { onNavegar("camara/${unidadCompleta.codigo ?: "CAMPO"}") }) {
                        Icon(Icons.Default.PhotoCamera, null, tint = GoldPrimary)
                    }
                    IconButton(onClick = { onNavegar("nuevo_nicho") }) {
                        Icon(Icons.Default.Add, null, tint = AlertGreen)
                    }
                }
            )
        },
        containerColor = NavyDeep
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {

            // ── Banner de estado ──────────────────────────────────────────────
            Box(modifier = Modifier.fillMaxWidth()
                .background(Brush.verticalGradient(listOf(
                    colorEstado.copy(0.25f), colorEstado.copy(0.05f))))
                .padding(16.dp)) {
                Row(modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Box(modifier = Modifier.clip(RoundedCornerShape(50))
                            .background(colorEstado.copy(0.2f))
                            .border(1.dp, colorEstado.copy(0.5f), RoundedCornerShape(50))
                            .padding(horizontal = 12.dp, vertical = 5.dp)) {
                            Text(unidadCompleta.estado?.lowercase()?.replaceFirstChar { it.uppercase() } ?: "Libre",
                                style = MaterialTheme.typography.labelLarge,
                                color = colorEstado, fontWeight = FontWeight.Bold)
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            InfoPill(Icons.Default.GridView,   "Fila ${unidadCompleta.fila ?: "—"}")
                            InfoPill(Icons.Default.ViewColumn, "Nº ${unidadCompleta.numero ?: "—"}")
                            InfoPill(Icons.Default.Category,   unidadCompleta.tipo ?: "Nicho")
                            InfoPill(Icons.Default.Tag,        "ID: ${unidad.id}")
                        }
                    }
                    // Mini resumen de la concesión activa
                    concesiones.firstOrNull { it.estado == "Vigente" }?.let { c ->
                        Column(horizontalAlignment = Alignment.End,
                            verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(c.titular?.nombreApellidos ?: "Sin titular",
                                style = MaterialTheme.typography.labelLarge,
                                color = TextPrimary, fontWeight = FontWeight.Bold,
                                textAlign = TextAlign.End)
                            Text("Vence: ${c.fechaVencimiento ?: "—"}",
                                style = MaterialTheme.typography.labelSmall, color = AlertAmber)
                        }
                    }
                }
            }

            // ── Pestañas ──────────────────────────────────────────────────────
            ScrollableTabRow(selectedTabIndex = selectedTab,
                containerColor = SurfaceCard, contentColor = GoldPrimary, edgePadding = 16.dp,
                indicator = { pos ->
                    TabRowDefaults.SecondaryIndicator(
                        modifier = Modifier.tabIndicatorOffset(pos[selectedTab]), color = GoldPrimary)
                }) {
                tabs.forEachIndexed { i, tab ->
                    Tab(selected = selectedTab == i, onClick = { selectedTab = i },
                        text = {
                            Text(tab, color = if (selectedTab == i) GoldPrimary else TextSecondary,
                                fontWeight = if (selectedTab == i) FontWeight.SemiBold else FontWeight.Normal,
                                style = MaterialTheme.typography.labelLarge)
                        })
                }
            }

            if (cargando) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = GoldPrimary)
                }
            } else {
                Column(modifier = Modifier.fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(bottom = 100.dp)) {
                    when (selectedTab) {
                        0 -> FichaApiTab(concesiones)
                        1 -> RestosApiTab(unidad, restos,
                            onRestoCreado   = { recargar() },
                            onTrasladado    = { recargar() })
                        2 -> DocumentosApiTab(unidad, documentos,
                            onDocumentoAdjunto = { recargar() })
                        3 -> EconomiaApiTab(unidad, concesiones, tasas,
                            onPagoRegistrado = { recargar() },
                            onNavegar = onNavegar)
                    }
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// PESTAÑA 1 — FICHA: titular y datos de la concesión activa
// ═══════════════════════════════════════════════════════════════
@Composable
fun FichaApiTab(concesiones: List<ConcesionResponse>) {
    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        if (concesiones.isEmpty()) {
            Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.PersonOff, null, tint = TextDisabled, modifier = Modifier.size(40.dp))
                    Text("Sin concesión registrada", style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
                    Text("Usa el botón + para registrar una nueva inhumación",
                        style = MaterialTheme.typography.bodySmall, color = TextDisabled,
                        textAlign = TextAlign.Center)
                }
            }
            return
        }

        concesiones.forEach { c ->
            val vigente = c.estado == "Vigente"
            SeccionCard(
                if (vigente) "Concesión Vigente" else "Concesión Caducada",
                if (vigente) Icons.Default.Badge else Icons.Default.History
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    c.titular?.let { t ->
                        DataRow("Titular",   t.nombreApellidos)
                        DataRow("DNI/NIF",   t.documento  ?: "—")
                        DataRow("Teléfono",  t.telefono   ?: "—")
                        DataRow("Email",     t.email      ?: "—")
                        DataRow("Dirección", t.direccion  ?: "—")
                        HorizontalDivider(color = BorderSubtle)
                    }
                    DataRow("Inicio",      c.fechaInicio       ?: "—")
                    DataRow("Vencimiento", c.fechaVencimiento  ?: "—",
                        valueColor = if (vigente) {
                            // Avisar si vence en menos de 1 año
                            try {
                                val fv = LocalDate.parse(c.fechaVencimiento)
                                if (fv.isBefore(LocalDate.now().plusYears(1))) AlertAmber else TextPrimary
                            } catch (e: Exception) { TextPrimary }
                        } else AlertRed)
                    DataRow("Estado",      c.estado ?: "—",
                        valueColor = if (vigente) AlertGreen else AlertRed)
                    if (!c.observaciones.isNullOrBlank()) {
                        HorizontalDivider(color = BorderSubtle)
                        Text(c.observaciones, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                    }
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// PESTAÑA 2 — RESTOS: difuntos + acciones de inhumar/trasladar
// ═══════════════════════════════════════════════════════════════
@Composable
fun RestosApiTab(
    unidad: UnidadResponse,
    restos: List<RestosResponse>,
    onRestoCreado: () -> Unit,
    onTrasladado: () -> Unit
) {
    var mostrarInhumar   by remember { mutableStateOf(false) }
    var mostrarTrasladar by remember { mutableStateOf(false) }

    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {

        if (restos.isEmpty()) {
            Box(Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.PersonOff, null, tint = TextDisabled, modifier = Modifier.size(40.dp))
                    Text("Sin restos registrados", style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
                }
            }
        }

        restos.forEach { r ->
            SeccionCard(r.nombreApellidos, Icons.Default.Person) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    DataRow("Inhumación", r.fechaInhumacion ?: "—")
                    DataRow("Procedencia", r.procedencia    ?: "—")
                    if (!r.notasHistoricas.isNullOrBlank()) {
                        HorizontalDivider(color = BorderSubtle)
                        Row(verticalAlignment = Alignment.Top,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Icon(Icons.Default.Notes, null, tint = AlertAmber, modifier = Modifier.size(14.dp))
                            Text(r.notasHistoricas, style = MaterialTheme.typography.bodySmall, color = AlertAmber)
                        }
                    }
                    // ID del resto (útil para trasladar)
                    Text("ID interno: ${r.id}", style = MaterialTheme.typography.labelSmall, color = TextDisabled)
                }
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = { mostrarInhumar = true },
                modifier = Modifier.weight(1f),
                border = BorderStroke(1.dp, NichoOcupado),
                shape = RoundedCornerShape(10.dp)) {
                Icon(Icons.Default.Add, null, tint = NichoOcupado, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(4.dp))
                Text("Inhumar", color = NichoOcupado, style = MaterialTheme.typography.labelLarge)
            }
            OutlinedButton(onClick = { mostrarTrasladar = true },
                modifier = Modifier.weight(1f),
                border = BorderStroke(1.dp, AlertAmber),
                shape = RoundedCornerShape(10.dp)) {
                Icon(Icons.Default.SwapHoriz, null, tint = AlertAmber, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(4.dp))
                Text("Trasladar", color = AlertAmber, style = MaterialTheme.typography.labelLarge)
            }
        }
    }

    if (mostrarInhumar) {
        DialogInhumarEnNicho(
            unidadId    = unidad.id ?: 0,
            codigoNicho = unidad.codigo ?: "Nicho ${unidad.id}",
            onDismiss   = { mostrarInhumar = false },
            onGuardado  = { mostrarInhumar = false; onRestoCreado() }
        )
    }
    if (mostrarTrasladar) {
        DialogTrasladarDesdeNicho(
            unidadOrigenId = unidad.id ?: 0,
            codigoNicho    = unidad.codigo ?: "Nicho ${unidad.id}",
            onDismiss      = { mostrarTrasladar = false },
            onGuardado     = { mostrarTrasladar = false; onTrasladado() }
        )
    }
}

// ═══════════════════════════════════════════════════════════════
// PESTAÑA 3 — DOCUMENTOS: lista real de la BD + adjuntar
// ═══════════════════════════════════════════════════════════════
@Composable
fun DocumentosApiTab(
    unidad: UnidadResponse,
    documentos: List<DocumentoResponse>,
    onDocumentoAdjunto: () -> Unit
) {
    var mostrarAdjuntar by remember { mutableStateOf(false) }

    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {

        // Botón adjuntar
        Row(modifier = Modifier.fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(GoldPrimary.copy(0.12f))
            .border(1.dp, GoldPrimary.copy(0.4f), RoundedCornerShape(12.dp))
            .clickable { mostrarAdjuntar = true }
            .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Icon(Icons.Default.UploadFile, null, tint = GoldPrimary, modifier = Modifier.size(28.dp))
            Column {
                Text("Adjuntar documento", style = MaterialTheme.typography.titleMedium,
                    color = GoldPrimary, fontWeight = FontWeight.SemiBold)
                Text("Título de propiedad, acta, foto de lápida...",
                    style = MaterialTheme.typography.bodySmall, color = TextSecondary)
            }
        }

        if (documentos.isEmpty()) {
            Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.FolderOpen, null, tint = TextDisabled, modifier = Modifier.size(48.dp))
                    Text("Sin documentos adjuntos", style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
                }
            }
        } else {
            documentos.forEach { doc ->
                val (iconDoc, colorDoc) = when (doc.tipo.uppercase()) {
                    "FOTO_LAPIDA"       -> Icons.Default.PhotoCamera to GoldPrimary
                    "TITULO_PROPIEDAD"  -> Icons.Default.Article     to NichoOcupado
                    "ACTA_INHUMACION"   -> Icons.Default.Description  to AlertGreen
                    "DISCREPANCIA"      -> Icons.Default.ReportProblem to AlertRed
                    else               -> Icons.Default.AttachFile    to TextSecondary
                }
                Row(modifier = Modifier.fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .background(SurfaceCard)
                    .border(1.dp, colorDoc.copy(0.3f), RoundedCornerShape(10.dp))
                    .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Box(modifier = Modifier.size(40.dp).clip(RoundedCornerShape(8.dp))
                        .background(colorDoc.copy(0.15f)), contentAlignment = Alignment.Center) {
                        Icon(iconDoc, null, tint = colorDoc, modifier = Modifier.size(20.dp))
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text(doc.tipo.lowercase().replace("_", " ").replaceFirstChar { it.uppercase() },
                            style = MaterialTheme.typography.labelLarge,
                            color = TextPrimary, fontWeight = FontWeight.SemiBold)
                        Text(doc.urlArchivo,
                            style = MaterialTheme.typography.labelSmall, color = TextDisabled,
                            maxLines = 2)
                    }
                }
            }
        }
    }

    if (mostrarAdjuntar) {
        DialogAdjuntarDocumento(
            unidadId   = unidad.id ?: 0,
            onDismiss  = { mostrarAdjuntar = false },
            onGuardado = { mostrarAdjuntar = false; onDocumentoAdjunto() }
        )
    }
}

// ─── Diálogo adjuntar documento ──────────────────────────────────────────────
@Composable
fun DialogAdjuntarDocumento(
    unidadId: Int,
    onDismiss: () -> Unit,
    onGuardado: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var tipo       by remember { mutableStateOf("TITULO_PROPIEDAD") }
    var ruta       by remember { mutableStateOf("") }
    var isLoading  by remember { mutableStateOf(false) }
    var errorMsg   by remember { mutableStateOf("") }
    var isSuccess  by remember { mutableStateOf(false) }

    val tipos = listOf(
        "TITULO_PROPIEDAD"  to "Título de propiedad",
        "ACTA_INHUMACION"   to "Acta de inhumación",
        "FOTO_LAPIDA"       to "Fotografía de lápida",
        "DISCREPANCIA"      to "Incidencia / Discrepancia",
        "OTRO"              to "Otro documento"
    )

    AlertDialog(
        onDismissRequest = { if (!isLoading) onDismiss() },
        containerColor = NavyMid,
        icon = { Icon(Icons.Default.AttachFile, null, tint = GoldPrimary, modifier = Modifier.size(32.dp)) },
        title = { Text("Adjuntar Documento", color = TextPrimary, fontWeight = FontWeight.Bold) },
        text = {
            Column(modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp)) {
                // Tipo de documento
                Text("Tipo", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                tipos.forEach { (val_, label) ->
                    val sel = tipo == val_
                    Row(modifier = Modifier.fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(if (sel) GoldPrimary.copy(0.15f) else SurfaceCard)
                        .border(1.dp, if (sel) GoldPrimary else BorderSubtle, RoundedCornerShape(8.dp))
                        .clickable { tipo = val_ }
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Icon(
                            if (sel) Icons.Default.RadioButtonChecked else Icons.Default.RadioButtonUnchecked,
                            null, tint = if (sel) GoldPrimary else TextSecondary, modifier = Modifier.size(18.dp))
                        Text(label, style = MaterialTheme.typography.labelLarge,
                            color = if (sel) GoldPrimary else TextPrimary,
                            fontWeight = if (sel) FontWeight.Bold else FontWeight.Normal)
                    }
                }
                // Ruta / referencia del fichero
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Referencia / ruta del archivo", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                    OutlinedTextField(value = ruta, onValueChange = { ruta = it; errorMsg = "" },
                        placeholder = { Text("Ej: docs/titulos/nicho_42.pdf", color = TextDisabled) },
                        singleLine = true, shape = RoundedCornerShape(10.dp),
                        colors = cementerioFieldColors(), modifier = Modifier.fillMaxWidth())
                }
                AnimatedVisibility(visible = errorMsg.isNotBlank()) {
                    Text(errorMsg, style = MaterialTheme.typography.labelSmall, color = AlertRed)
                }
                AnimatedVisibility(visible = isSuccess) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.CheckCircle, null, tint = AlertGreen, modifier = Modifier.size(16.dp))
                        Text("Documento registrado", style = MaterialTheme.typography.bodySmall, color = AlertGreen)
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (ruta.isBlank()) { errorMsg = "Introduce la referencia del archivo"; return@Button }
                    isLoading = true; errorMsg = ""
                    scope.launch {
                        CementerioRepository.guardarDocumento(
                            DocumentoRequest(IdWrapper(unidadId), tipo, ruta)
                        ).onSuccess { isSuccess = true; isLoading = false }
                         .onFailure { errorMsg = it.message ?: "Error"; isLoading = false }
                    }
                },
                enabled = ruta.isNotBlank() && !isLoading && !isSuccess,
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = GoldPrimary, contentColor = NavyDeep)
            ) {
                if (isLoading) CircularProgressIndicator(Modifier.size(16.dp), color = NavyDeep, strokeWidth = 2.dp)
                else Text("Guardar", fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = { if (!isLoading) { if (isSuccess) onGuardado() else onDismiss() } }) {
                Text(if (isSuccess) "Cerrar" else "Cancelar", color = TextSecondary)
            }
        }
    )
}

// ═══════════════════════════════════════════════════════════════
// PESTAÑA 4 — ECONOMÍA: tasas reales + registrar pago + nueva concesión
// ═══════════════════════════════════════════════════════════════

// ─── Componentes compartidos (heredados del diseño original) ──────────────────
@Composable
fun SeccionCard(title: String, icon: ImageVector, content: @Composable ColumnScope.() -> Unit) {
    GoldBorderCard(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(icon, null, tint = GoldPrimary, modifier = Modifier.size(18.dp))
                Text(title, style = MaterialTheme.typography.titleMedium,
                    color = TextPrimary, fontWeight = FontWeight.SemiBold)
            }
            HorizontalDivider(color = BorderSubtle)
            content()
        }
    }
}

@Composable
fun DataRow(label: String, value: String, valueColor: Color = TextPrimary) {
    Row(modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.Top) {
        Text(label, style = MaterialTheme.typography.bodySmall,
            color = TextSecondary, modifier = Modifier.weight(0.45f))
        Text(value, style = MaterialTheme.typography.bodyMedium,
            color = valueColor, fontWeight = FontWeight.Medium,
            modifier = Modifier.weight(0.55f), textAlign = TextAlign.End)
    }
}

@Composable
fun InfoPill(icon: ImageVector, text: String) {
    Row(modifier = Modifier.clip(RoundedCornerShape(6.dp))
        .background(SurfaceCard).padding(horizontal = 8.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        Icon(icon, null, tint = TextSecondary, modifier = Modifier.size(12.dp))
        Text(text, style = MaterialTheme.typography.labelSmall, color = TextSecondary)
    }
}
