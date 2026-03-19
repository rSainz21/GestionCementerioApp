package com.corrales.cementerio.ui.screens

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
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
import androidx.compose.ui.unit.sp
import com.corrales.cementerio.data.model.*
import com.corrales.cementerio.ui.components.*
import com.corrales.cementerio.ui.theme.*

@Composable
fun NuevoTitularScreen(
    codigoNicho: String = "",
    onBack: () -> Unit = {},
    onGuardar: () -> Unit = {}
) {
    // ── Titular ──────────────────────────────────────────────────────────────
    var nombre      by remember { mutableStateOf("") }
    var apellidos   by remember { mutableStateOf("") }
    var dni         by remember { mutableStateOf("") }
    var telefono    by remember { mutableStateOf("") }
    var email       by remember { mutableStateOf("") }
    var direccion   by remember { mutableStateOf("") }

    // ── Herederos ────────────────────────────────────────────────────────────
    var herederos   by remember { mutableStateOf(listOf<Triple<String,String,String>>()) }
    var showAddHeredero by remember { mutableStateOf(false) }
    var herNombre   by remember { mutableStateOf("") }
    var herApellidos by remember { mutableStateOf("") }
    var herTelefono by remember { mutableStateOf("") }

    // ── Concesión ────────────────────────────────────────────────────────────
    var fechaInicio     by remember { mutableStateOf("") }
    var fechaVenc       by remember { mutableStateOf("") }
    var tasaAnual       by remember { mutableStateOf("48.00") }
    var estadoPago      by remember { mutableStateOf(EstadoPago.AL_DIA) }
    var duracionSelec   by remember { mutableIntStateOf(10) } // años
    val duraciones = listOf(5, 10, 25, 50, 99)

    var mostrarExito by remember { mutableStateOf(false) }

    val valido = nombre.isNotBlank() && apellidos.isNotBlank() && dni.isNotBlank()

    Scaffold(
        topBar = {
            CementerioTopBar(
                title = "Nueva Concesión",
                subtitle = if (codigoNicho.isNotBlank()) "Nicho $codigoNicho" else "Registro de titular",
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, null, tint = GoldPrimary)
                    }
                }
            )
        },
        bottomBar = {
            Column(modifier = Modifier.fillMaxWidth().background(NavyDeep)
                .padding(horizontal = 20.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (!valido) {
                    Row(verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Icon(Icons.Default.Info, null, tint = AlertAmber, modifier = Modifier.size(14.dp))
                        Text("Nombre, apellidos y DNI son obligatorios",
                            style = MaterialTheme.typography.labelSmall, color = AlertAmber)
                    }
                }
                Button(
                    onClick = { mostrarExito = true },
                    modifier = Modifier.fillMaxWidth().height(56.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = GoldPrimary, contentColor = NavyDeep),
                    enabled = valido
                ) {
                    Icon(Icons.Default.Save, null, modifier = Modifier.size(20.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Guardar Concesión", fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.labelLarge)
                }
            }
        },
        containerColor = NavyDeep
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)
            .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp)) {

            Spacer(Modifier.height(4.dp))

            // ── Banner nicho vinculado ────────────────────────────────────────
            if (codigoNicho.isNotBlank()) {
                Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(GoldPrimary.copy(alpha = 0.12f))
                    .border(1.dp, GoldPrimary.copy(alpha = 0.4f), RoundedCornerShape(12.dp))
                    .padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Icon(Icons.Default.Link, null, tint = GoldPrimary, modifier = Modifier.size(20.dp))
                    Column {
                        Text("Vinculando concesión a:", style = MaterialTheme.typography.labelSmall, color = TextSecondary)
                        Text(codigoNicho, style = MaterialTheme.typography.titleMedium,
                            color = GoldPrimary, fontWeight = FontWeight.Bold)
                    }
                }
            }

            // ── Sección titular ───────────────────────────────────────────────
            FormSection("Datos del Titular", Icons.Default.Person, GoldPrimary) {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    FormField("Nombre *", nombre, { nombre = it }, "Nombre", Modifier.weight(1f))
                    FormField("Apellidos *", apellidos, { apellidos = it }, "Apellidos", Modifier.weight(1f))
                }
                FormField("DNI / NIF *", dni, { dni = it }, "12345678A")
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    FormField("Teléfono", telefono, { telefono = it }, "+34 600 000 000",
                        Modifier.weight(1f), KeyboardType.Phone)
                    FormField("Email", email, { email = it }, "correo@email.com",
                        Modifier.weight(1f), KeyboardType.Email)
                }
                FormField("Dirección", direccion, { direccion = it }, "Calle, número, ciudad...")
            }

            // ── Herederos ─────────────────────────────────────────────────────
            FormSection("Herederos y Contacto", Icons.Default.Group, NichoOcupado) {
                if (herederos.isEmpty()) {
                    Row(modifier = Modifier.fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp)).background(SurfaceSunken)
                        .padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Icon(Icons.Default.PersonOff, null, tint = TextDisabled, modifier = Modifier.size(18.dp))
                        Text("Sin herederos registrados",
                            style = MaterialTheme.typography.bodySmall, color = TextDisabled)
                    }
                } else {
                    herederos.forEachIndexed { i, (n, a, t) ->
                        Row(modifier = Modifier.fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp)).background(SurfaceSunken)
                            .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            Box(modifier = Modifier.size(32.dp).clip(CircleShape)
                                .background(NichoOcupado.copy(alpha = 0.2f)),
                                contentAlignment = Alignment.Center) {
                                Text("${i+1}", color = NichoOcupado,
                                    style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
                            }
                            Column(modifier = Modifier.weight(1f)) {
                                Text("$n $a", style = MaterialTheme.typography.bodyMedium,
                                    color = TextPrimary, fontWeight = FontWeight.SemiBold)
                                if (t.isNotBlank()) Text(t, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                            }
                            IconButton(onClick = { herederos = herederos.toMutableList().also { list -> list.removeAt(i) } }) {
                                Icon(Icons.Default.DeleteOutline, null, tint = AlertRed, modifier = Modifier.size(18.dp))
                            }
                        }
                    }
                }

                // Mini formulario añadir heredero
                if (showAddHeredero) {
                    Column(modifier = Modifier.fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(SurfaceCard)
                        .border(1.dp, NichoOcupado.copy(alpha = 0.4f), RoundedCornerShape(12.dp))
                        .padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text("Nuevo heredero", style = MaterialTheme.typography.labelLarge,
                            color = NichoOcupado, fontWeight = FontWeight.SemiBold)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            FormField("Nombre", herNombre, { herNombre = it }, "Nombre", Modifier.weight(1f))
                            FormField("Apellidos", herApellidos, { herApellidos = it }, "Apellidos", Modifier.weight(1f))
                        }
                        FormField("Teléfono", herTelefono, { herTelefono = it }, "+34 600...", keyboardType = KeyboardType.Phone)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(onClick = { showAddHeredero = false; herNombre = ""; herApellidos = ""; herTelefono = "" },
                                modifier = Modifier.weight(1f), border = BorderStroke(1.dp, BorderSubtle),
                                shape = RoundedCornerShape(10.dp)) {
                                Text("Cancelar", color = TextSecondary)
                            }
                            Button(onClick = {
                                if (herNombre.isNotBlank()) {
                                    herederos = herederos + Triple(herNombre, herApellidos, herTelefono)
                                    showAddHeredero = false; herNombre = ""; herApellidos = ""; herTelefono = ""
                                }
                            }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(10.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = NichoOcupado)) {
                                Text("Añadir", color = Color.White)
                            }
                        }
                    }
                } else {
                    OutlinedButton(
                        onClick = { showAddHeredero = true },
                        modifier = Modifier.fillMaxWidth(),
                        border = BorderStroke(1.dp, NichoOcupado.copy(alpha = 0.5f)),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Default.PersonAdd, null, tint = NichoOcupado, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Añadir heredero", color = NichoOcupado)
                    }
                }
            }

            // ── Concesión ─────────────────────────────────────────────────────
            FormSection("Datos de la Concesión", Icons.Default.Description, AlertGreen) {
                // Selector duración rápida
                Text("Duración de la concesión", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                Spacer(Modifier.height(4.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    duraciones.forEach { anos ->
                        Box(modifier = Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .background(if (duracionSelec == anos) AlertGreen.copy(alpha = 0.2f) else SurfaceCard)
                            .border(1.dp, if (duracionSelec == anos) AlertGreen else BorderSubtle, RoundedCornerShape(10.dp))
                            .clickable { duracionSelec = anos }
                            .padding(horizontal = 10.dp, vertical = 8.dp),
                            contentAlignment = Alignment.Center) {
                            Text("$anos años",
                                style = MaterialTheme.typography.labelLarge,
                                color = if (duracionSelec == anos) AlertGreen else TextSecondary,
                                fontWeight = if (duracionSelec == anos) FontWeight.Bold else FontWeight.Normal)
                        }
                    }
                }
                Spacer(Modifier.height(4.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    FormField("Fecha inicio", fechaInicio, { fechaInicio = it },
                        "DD/MM/AAAA", Modifier.weight(1f))
                    FormField("Vencimiento", fechaVenc, { fechaVenc = it },
                        "DD/MM/AAAA", Modifier.weight(1f))
                }
                FormField("Tasa anual (€)", tasaAnual, { tasaAnual = it },
                    "Ej: 48.00", keyboardType = KeyboardType.Decimal)

                // Estado de pago
                Text("Estado del pago", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                Spacer(Modifier.height(4.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    EstadoPago.values().forEach { ep ->
                        val epColor = when (ep) {
                            EstadoPago.AL_DIA   -> AlertGreen
                            EstadoPago.IMPAGO   -> AlertRed
                            EstadoPago.PENDIENTE -> AlertAmber
                            EstadoPago.EXENTO   -> TextSecondary
                        }
                        Box(modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (estadoPago == ep) epColor.copy(alpha = 0.2f) else SurfaceCard)
                            .border(1.dp, if (estadoPago == ep) epColor else BorderSubtle, RoundedCornerShape(8.dp))
                            .clickable { estadoPago = ep }
                            .padding(horizontal = 10.dp, vertical = 6.dp)) {
                            Text(ep.label,
                                style = MaterialTheme.typography.labelSmall,
                                color = if (estadoPago == ep) epColor else TextSecondary,
                                fontWeight = if (estadoPago == ep) FontWeight.Bold else FontWeight.Normal)
                        }
                    }
                }
            }

            Spacer(Modifier.height(80.dp))
        }
    }

    if (mostrarExito) {
        AlertDialog(
            onDismissRequest = {},
            containerColor = NavyMid,
            icon = { Icon(Icons.Default.CheckCircle, null, tint = AlertGreen, modifier = Modifier.size(44.dp)) },
            title = { Text("¡Concesión registrada!", color = TextPrimary, fontWeight = FontWeight.Bold) },
            text = {
                Text("La concesión a nombre de $nombre $apellidos ha sido registrada correctamente${if (codigoNicho.isNotBlank()) " en el nicho $codigoNicho" else ""}.",
                    color = TextSecondary)
            },
            confirmButton = {
                Button(onClick = { mostrarExito = false; onGuardar() },
                    colors = ButtonDefaults.buttonColors(containerColor = GoldPrimary, contentColor = NavyDeep)) {
                    Text("Aceptar", fontWeight = FontWeight.Bold)
                }
            }
        )
    }
}
