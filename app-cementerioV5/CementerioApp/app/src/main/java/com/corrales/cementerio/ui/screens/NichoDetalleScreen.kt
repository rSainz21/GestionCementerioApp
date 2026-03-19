package com.corrales.cementerio.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.corrales.cementerio.data.model.*
import com.corrales.cementerio.ui.components.*
import com.corrales.cementerio.ui.theme.*
import java.time.format.DateTimeFormatter
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.ui.text.input.KeyboardType
import com.corrales.cementerio.data.model.*
import com.corrales.cementerio.data.repository.CementerioRepository
import kotlinx.coroutines.launch
import java.time.LocalDate
import com.corrales.cementerio.data.model.IdWrapper
import com.corrales.cementerio.data.model.MovimientoRequest
import com.corrales.cementerio.data.model.RestosRequest

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NichoDetalleScreen(unidad: UnidadEnterramiento, onBack: () -> Unit = {}, onTomarFoto: () -> Unit = {}, onNuevaConcesion: () -> Unit = {}) {
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("Ficha", "Restos", "Documentos", "Economía")
    val fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy")

    Scaffold(
        topBar = {
            CementerioTopBar(
                title = unidad.codigo,
                subtitle = unidad.bloque,
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, null, tint = GoldPrimary) }
                },
                actions = {
                    IconButton(onClick = {}) { Icon(Icons.Default.Edit, null, tint = GoldPrimary) }
                    IconButton(onClick = {}) { Icon(Icons.Default.MoreVert, null, tint = TextSecondary) }
                }
            )
        },
        containerColor = NavyDeep
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            EstadoHeroBanner(unidad, onTomarFoto)
            ScrollableTabRow(
                selectedTabIndex = selectedTab,
                containerColor = SurfaceCard,
                contentColor = GoldPrimary,
                edgePadding = 16.dp,
                indicator = { tabPositions ->
                    TabRowDefaults.SecondaryIndicator(
                        modifier = Modifier.tabIndicatorOffset(tabPositions[selectedTab]),
                        color = GoldPrimary
                    )
                }
            ) {
                tabs.forEachIndexed { i, tab ->
                    Tab(
                        selected = selectedTab == i,
                        onClick = { selectedTab = i },
                        text = {
                            Text(tab,
                                color = if (selectedTab == i) GoldPrimary else TextSecondary,
                                fontWeight = if (selectedTab == i) FontWeight.SemiBold else FontWeight.Normal,
                                style = MaterialTheme.typography.labelLarge)
                        }
                    )
                }
            }
            Column(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(bottom = 100.dp)) {
                when (selectedTab) {
                    0 -> FichaTab(unidad, fmt)
                    1 -> RestosTab(unidad, fmt)
                    2 -> DocumentosTab(unidad)
                    3 -> EconomiaTab(unidad, onNuevaConcesion)
                }
            }
        }
    }
}

@Composable
fun EstadoHeroBanner(unidad: UnidadEnterramiento, onTomarFoto: () -> Unit = {}) {
    val color = when (unidad.estado) {
        EstadoNicho.OCUPADO   -> NichoOcupado
        EstadoNicho.LIBRE     -> NichoLibre
        EstadoNicho.CADUCADO  -> NichoCaducado
        EstadoNicho.RESERVADO -> NichoReservado
        EstadoNicho.PENDIENTE -> NichoPendiente
    }
    Box(
        modifier = Modifier.fillMaxWidth()
            .background(Brush.verticalGradient(listOf(color.copy(alpha = 0.25f), color.copy(alpha = 0.05f))))
            .border(BorderStroke(1.dp, color.copy(alpha = 0.3f)))
            .padding(20.dp)
    ) {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                EstadoChip(unidad.estado)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    InfoPill(Icons.Default.GridView, "Fila ${unidad.fila}")
                    InfoPill(Icons.Default.ViewColumn, "Col. ${unidad.columna}")
                    InfoPill(Icons.Default.Category, unidad.tipo.label)
                }
                if (unidad.esHuerfano) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier.clip(RoundedCornerShape(8.dp))
                            .background(NichoPendiente.copy(alpha = 0.2f))
                            .padding(horizontal = 10.dp, vertical = 5.dp)
                    ) {
                        Icon(Icons.Default.Warning, null, tint = NichoPendiente, modifier = Modifier.size(14.dp))
                        Text("Sin ubicación confirmada · Verificar en campo", style = MaterialTheme.typography.labelSmall, color = NichoPendiente)
                    }
                }
            }
            Box(
                modifier = Modifier.size(80.dp).clip(RoundedCornerShape(12.dp)).clickable { onTomarFoto() }
                    .background(SurfaceCard).border(1.dp, color.copy(alpha = 0.4f), RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Icon(Icons.Default.AddAPhoto, null, tint = GoldPrimary, modifier = Modifier.size(24.dp))
                    Text("Añadir\nfoto", style = MaterialTheme.typography.labelSmall, color = TextDisabled, textAlign = TextAlign.Center)
                }
            }
        }
    }
}

@Composable
fun InfoPill(icon: ImageVector, text: String) {
    Row(
        modifier = Modifier.clip(RoundedCornerShape(6.dp)).background(SurfaceCard).padding(horizontal = 8.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Icon(icon, null, tint = TextSecondary, modifier = Modifier.size(12.dp))
        Text(text, style = MaterialTheme.typography.labelSmall, color = TextSecondary)
    }
}

@Composable
fun FichaTab(unidad: UnidadEnterramiento, fmt: DateTimeFormatter) {
    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        unidad.concesion?.let { c ->
            SeccionCard("Titular de la Concesión", Icons.Default.Person) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    DataRow("Nombre", "${c.titular.nombre} ${c.titular.apellidos}")
                    DataRow("DNI", c.titular.dni.ifBlank { "—" })
                    DataRow("Teléfono", c.titular.telefono.ifBlank { "—" })
                    DataRow("Email", c.titular.email.ifBlank { "—" })
                    HorizontalDivider(color = BorderSubtle)
                    DataRow("Inicio", c.fechaInicio.format(fmt))
                    DataRow("Vencimiento", c.fechaVencimiento.format(fmt),
                        valueColor = if (c.fechaVencimiento.isBefore(java.time.LocalDate.now().plusYears(1))) AlertAmber else TextPrimary)
                    DataRow("Estado de pago", c.estadoPago.label,
                        valueColor = when (c.estadoPago) {
                            EstadoPago.AL_DIA -> AlertGreen; EstadoPago.IMPAGO -> AlertRed
                            EstadoPago.PENDIENTE -> AlertAmber; EstadoPago.EXENTO -> TextSecondary
                        })
                }
            }
        }
        if (unidad.notas.isNotBlank()) {
            SeccionCard("Notas", Icons.Default.Notes) {
                Text(unidad.notas, style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
            }
        }
    }
}

@Composable
fun RestosTab(unidad: UnidadEnterramiento, fmt: DateTimeFormatter) {
    // Estado local para controlar qué diálogo está abierto
    var mostrarInhumar   by remember { mutableStateOf(false) }
    var mostrarTrasladar by remember { mutableStateOf(false) }

    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {

        // Lista de restos registrados
        if (unidad.difuntos.isEmpty()) {
            Box(modifier = Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.PersonOff, null, tint = TextDisabled, modifier = Modifier.size(40.dp))
                    Text("Sin restos registrados", style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
                    Text("Este nicho aparece como libre", style = MaterialTheme.typography.bodySmall, color = TextDisabled)
                }
            }
        }

        unidad.difuntos.forEach { d ->
            SeccionCard("${d.nombre} ${d.apellidos}", Icons.Default.Person) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    d.fechaNacimiento?.let { DataRow("Nacimiento", it.format(fmt)) }
                    DataRow("Defunción",  d.fechaDefuncion.format(fmt))
                    DataRow("Inhumación", d.fechaInhumacion.format(fmt))
                    if (d.procedencia.isNotBlank()) DataRow("Procedencia", d.procedencia)
                    if (d.notas.isNotBlank()) {
                        HorizontalDivider(color = BorderSubtle)
                        Text(d.notas, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                    }
                }
            }
        }

        // Botones de acción
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(
                onClick = { mostrarInhumar = true },
                modifier = Modifier.weight(1f),
                border = BorderStroke(1.dp, NichoOcupado),
                shape = RoundedCornerShape(10.dp)
            ) {
                Icon(Icons.Default.Add, null, tint = NichoOcupado, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(4.dp))
                Text("Inhumar", color = NichoOcupado, style = MaterialTheme.typography.labelLarge)
            }
            OutlinedButton(
                onClick = { mostrarTrasladar = true },
                modifier = Modifier.weight(1f),
                border = BorderStroke(1.dp, AlertAmber),
                shape = RoundedCornerShape(10.dp)
            ) {
                Icon(Icons.Default.SwapHoriz, null, tint = AlertAmber, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(4.dp))
                Text("Trasladar", color = AlertAmber, style = MaterialTheme.typography.labelLarge)
            }
        }
    }

    // Diálogos — reutilizamos los mismos que en MapaScreen
    if (mostrarInhumar) {
        DialogInhumarEnNicho(
            // El código del nicho es el id de la unidad de la sample data
            unidadId    = unidad.id.toIntOrNull() ?: 0,
            codigoNicho = unidad.codigo,
            onDismiss   = { mostrarInhumar = false },
            onGuardado  = { mostrarInhumar = false }
        )
    }
    if (mostrarTrasladar) {
        DialogTrasladarDesdeNicho(
            unidadOrigenId = unidad.id.toIntOrNull() ?: 0,
            codigoNicho    = unidad.codigo,
            onDismiss      = { mostrarTrasladar = false },
            onGuardado     = { mostrarTrasladar = false }
        )
    }
}

@Composable
fun DocumentosTab(unidad: UnidadEnterramiento) {
    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp))
                .background(GoldPrimary.copy(alpha = 0.12f))
                .border(1.dp, GoldPrimary.copy(alpha = 0.4f), RoundedCornerShape(12.dp))
                .clickable {}.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(Icons.Default.UploadFile, null, tint = GoldPrimary, modifier = Modifier.size(28.dp))
            Column {
                Text("Adjuntar documento", style = MaterialTheme.typography.titleMedium, color = GoldPrimary, fontWeight = FontWeight.SemiBold)
                Text("PDF, JPG, PNG – Máx. 10 MB", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
            }
        }
        Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Default.FolderOpen, null, tint = TextDisabled, modifier = Modifier.size(48.dp))
                Text("Sin documentos adjuntos", style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
            }
        }
    }
}

@Composable
fun EconomiaTab(unidad: UnidadEnterramiento, onNuevaConcesion: () -> Unit = {}) {
    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        val c = unidad.concesion ?: run {
            Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                Text("Sin concesión activa", style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
            }
            return@Column
        }
        SeccionCard("Datos Económicos", Icons.Default.Euro) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                DataRow("Tasa anual", "${c.tasaAnual} €")
                DataRow("Estado pago", c.estadoPago.label,
                    valueColor = when (c.estadoPago) {
                        EstadoPago.AL_DIA -> AlertGreen; EstadoPago.IMPAGO -> AlertRed
                        else -> AlertAmber
                    })
            }
        }
        listOf(
            Triple("Nueva / Editar concesión", Icons.Default.Badge, GoldPrimary),
            Triple("Registrar pago", Icons.Default.AttachMoney, AlertGreen),
            Triple("Iniciar expediente de impago", Icons.Default.Gavel, AlertRed),
        ).forEachIndexed { idx, (label, icon, color) ->
            Row(
                modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp))
                    .background(SurfaceCard).border(1.dp, color.copy(alpha = 0.3f), RoundedCornerShape(12.dp))
                    .clickable { if (idx == 0) onNuevaConcesion() }.padding(14.dp),
                verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Box(modifier = Modifier.size(36.dp).clip(RoundedCornerShape(8.dp)).background(color.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
                    Icon(icon, null, tint = color, modifier = Modifier.size(18.dp))
                }
                Text(label, style = MaterialTheme.typography.bodyMedium, color = TextPrimary, modifier = Modifier.weight(1f))
                Icon(Icons.Default.ChevronRight, null, tint = TextDisabled)
            }
        }
    }
}

@Composable
fun SeccionCard(title: String, icon: ImageVector, content: @Composable ColumnScope.() -> Unit) {
    GoldBorderCard(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(icon, null, tint = GoldPrimary, modifier = Modifier.size(18.dp))
                Text(title, style = MaterialTheme.typography.titleMedium, color = TextPrimary, fontWeight = FontWeight.SemiBold)
            }
            HorizontalDivider(color = BorderSubtle)
            content()
        }
    }
}

@Composable
fun DataRow(label: String, value: String, valueColor: Color = TextPrimary) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Top) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = TextSecondary, modifier = Modifier.weight(0.45f))
        Text(value, style = MaterialTheme.typography.bodyMedium, color = valueColor, fontWeight = FontWeight.Medium,
            modifier = Modifier.weight(0.55f), textAlign = TextAlign.End)
    }
}
