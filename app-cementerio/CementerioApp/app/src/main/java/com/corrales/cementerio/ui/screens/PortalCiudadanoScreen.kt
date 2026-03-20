package com.corrales.cementerio.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.*
import com.corrales.cementerio.data.model.*
import com.corrales.cementerio.data.repository.CementerioRepository
import com.corrales.cementerio.ui.components.*
import com.corrales.cementerio.ui.theme.*
import kotlinx.coroutines.launch

/**
 * Portal ciudadano — accesible sin login.
 * Permite a cualquier vecino buscar a un familiar fallecido
 * y ver en qué nicho está y cómo llegar.
 * Este es el argumento político más potente del proyecto:
 * "Cualquier ciudadano de Los Corrales puede encontrar a su familiar desde el móvil."
 */
@Composable
fun PortalCiudadanoScreen(onBack: () -> Unit = {}) {
    val scope = rememberCoroutineScope()

    var query       by remember { mutableStateOf("") }
    var resultados  by remember { mutableStateOf<List<RestosResponse>>(emptyList()) }
    var buscando    by remember { mutableStateOf(false) }
    var haBuscado   by remember { mutableStateOf(false) }
    var seleccionado by remember { mutableStateOf<RestosResponse?>(null) }

    fun buscar() {
        if (query.length < 2) return
        buscando = true; haBuscado = true; resultados = emptyList()
        scope.launch {
            CementerioRepository.buscarRestosPorNombre(query)
                .onSuccess { resultados = it }
            buscando = false
        }
    }

    CementerioBackground {
        Column(modifier = Modifier.fillMaxSize()) {

            // Cabecera ciudadana — diferente al estilo de operario
            Box(modifier = Modifier.fillMaxWidth()
                .background(Brush.verticalGradient(
                    listOf(NavyDeep, NavyMid, NavyDeep)))) {
                Column(modifier = Modifier.fillMaxWidth()
                    .padding(horizontal = 24.dp, vertical = 32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically) {
                        IconButton(onClick = onBack) {
                            Icon(Icons.Default.ArrowBack, null, tint = GoldPrimary)
                        }
                        Spacer(Modifier.weight(1f))
                    }
                    Icon(Icons.Default.AccountBalance, null,
                        tint = GoldPrimary, modifier = Modifier.size(48.dp))
                    Text("Cementerios Municipales",
                        style = MaterialTheme.typography.headlineSmall,
                        color = TextPrimary, fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center)
                    Text("Los Corrales de Buelna",
                        style = MaterialTheme.typography.titleMedium,
                        color = GoldPrimary)
                    Text("Buscador de familiares",
                        style = MaterialTheme.typography.bodyMedium, color = TextSecondary,
                        textAlign = TextAlign.Center)

                    Spacer(Modifier.height(8.dp))

                    // Campo de búsqueda
                    Row(modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically) {
                        OutlinedTextField(
                            value = query,
                            onValueChange = { query = it },
                            placeholder = { Text("Nombre o apellidos del familiar...",
                                color = TextDisabled) },
                            leadingIcon = {
                                Icon(Icons.Default.Search, null, tint = GoldPrimary)
                            },
                            trailingIcon = {
                                if (query.isNotBlank()) {
                                    IconButton(onClick = {
                                        query = ""; resultados = emptyList(); haBuscado = false
                                    }) {
                                        Icon(Icons.Default.Clear, null, tint = TextSecondary)
                                    }
                                }
                            },
                            singleLine = true,
                            shape = RoundedCornerShape(14.dp),
                            colors = cementerioFieldColors(),
                            modifier = Modifier.weight(1f)
                        )
                        Button(
                            onClick = { buscar() },
                            shape = RoundedCornerShape(14.dp),
                            enabled = query.length >= 2 && !buscando,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = GoldPrimary, contentColor = NavyDeep),
                            modifier = Modifier.height(56.dp)
                        ) {
                            if (buscando)
                                CircularProgressIndicator(Modifier.size(20.dp),
                                    color = NavyDeep, strokeWidth = 2.dp)
                            else
                                Icon(Icons.Default.Search, null, modifier = Modifier.size(24.dp))
                        }
                    }
                }
            }

            // Resultados
            when {
                !haBuscado -> {
                    // Estado inicial
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(16.dp),
                            modifier = Modifier.padding(32.dp)) {
                            Icon(Icons.Default.ManageSearch, null,
                                tint = GoldPrimary.copy(0.3f), modifier = Modifier.size(80.dp))
                            Text("Introduce el nombre del familiar",
                                style = MaterialTheme.typography.titleMedium,
                                color = TextSecondary, textAlign = TextAlign.Center)
                            Text("Busca por nombre y/o apellidos.\nNecesitas al menos 2 caracteres.",
                                style = MaterialTheme.typography.bodySmall, color = TextDisabled,
                                textAlign = TextAlign.Center)

                            // Info de los cementerios
                            Spacer(Modifier.height(8.dp))
                            Text("Cementerios disponibles:",
                                style = MaterialTheme.typography.labelLarge,
                                color = GoldPrimary, fontWeight = FontWeight.Bold)
                            listOf(
                                "Cementerio Municipal Los Corrales",
                                "Cementerio de Somahoz",
                                "Cementerio de Buelna"
                            ).forEach { nombre ->
                                Row(modifier = Modifier.fillMaxWidth()
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(SurfaceCard)
                                    .padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Icon(Icons.Default.LocationOn, null, tint = GoldPrimary,
                                        modifier = Modifier.size(16.dp))
                                    Text(nombre, style = MaterialTheme.typography.bodySmall,
                                        color = TextSecondary)
                                }
                            }
                        }
                    }
                }

                resultados.isEmpty() && !buscando -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Icon(Icons.Default.SearchOff, null, tint = TextDisabled,
                                modifier = Modifier.size(56.dp))
                            Text("No se encontraron resultados para \"$query\"",
                                style = MaterialTheme.typography.titleMedium,
                                color = TextSecondary, textAlign = TextAlign.Center)
                            Text("Prueba con el primer apellido o el nombre completo",
                                style = MaterialTheme.typography.bodySmall, color = TextDisabled,
                                textAlign = TextAlign.Center)
                        }
                    }
                }

                else -> {
                    LazyColumn(modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp, bottom = 80.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        item {
                            Text("${resultados.size} resultado${if (resultados.size != 1) "s" else ""} para \"$query\"",
                                style = MaterialTheme.typography.labelLarge,
                                color = TextSecondary,
                                modifier = Modifier.padding(bottom = 4.dp))
                        }
                        items(resultados, key = { it.id ?: it.hashCode() }) { resto ->
                            ResultadoCiudadanoCard(
                                resto = resto,
                                seleccionado = seleccionado?.id == resto.id,
                                onClick = {
                                    seleccionado = if (seleccionado?.id == resto.id) null else resto
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ResultadoCiudadanoCard(
    resto: RestosResponse,
    seleccionado: Boolean,
    onClick: () -> Unit
) {
    val tieneUbicacion = resto.unidad != null
    val borderColor = if (tieneUbicacion) NichoOcupado else NichoPendiente

    Column(modifier = Modifier.fillMaxWidth()
        .clip(RoundedCornerShape(16.dp))
        .background(SurfaceCard)
        .border(1.5.dp, borderColor.copy(if (seleccionado) 0.8f else 0.3f), RoundedCornerShape(16.dp))
        .clickable { onClick() }) {

        // Fila principal
        Row(modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            // Avatar
            Box(modifier = Modifier.size(52.dp).clip(CircleShape)
                .background(borderColor.copy(0.15f)),
                contentAlignment = Alignment.Center) {
                Icon(Icons.Default.Person, null, tint = borderColor,
                    modifier = Modifier.size(28.dp))
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(resto.nombreApellidos, style = MaterialTheme.typography.titleMedium,
                    color = TextPrimary, fontWeight = FontWeight.Bold)
                resto.fechaInhumacion?.let {
                    Text("Inhumado: $it", style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary)
                }
                if (tieneUbicacion) {
                    Row(verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        Icon(Icons.Default.LocationOn, null, tint = NichoOcupado,
                            modifier = Modifier.size(14.dp))
                        Text(resto.unidad!!.codigo ?: "Nicho ${resto.unidad.id}",
                            style = MaterialTheme.typography.labelLarge,
                            color = NichoOcupado, fontWeight = FontWeight.SemiBold)
                    }
                } else {
                    Row(verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        Icon(Icons.Default.Warning, null, tint = NichoPendiente,
                            modifier = Modifier.size(14.dp))
                        Text("Pendiente de localización",
                            style = MaterialTheme.typography.labelSmall, color = NichoPendiente)
                    }
                }
            }
            Icon(
                if (seleccionado) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                null, tint = GoldPrimary
            )
        }

        // Detalle expandible
        AnimatedVisibility(visible = seleccionado && tieneUbicacion) {
            Column(modifier = Modifier.fillMaxWidth()
                .background(NichoOcupado.copy(0.05f))
                .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)) {

                HorizontalDivider(color = BorderSubtle)

                Text("INFORMACIÓN DE LOCALIZACIÓN",
                    style = MaterialTheme.typography.labelSmall,
                    color = GoldPrimary, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)

                resto.unidad?.let { u ->
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        InfoPill(Icons.Default.GridView,   "Fila ${u.fila ?: "—"}")
                        InfoPill(Icons.Default.ViewColumn, "Nº ${u.numero ?: "—"}")
                        InfoPill(Icons.Default.Category,   u.tipo ?: "Nicho")
                    }
                }

                // Información de la procedencia
                if (!resto.procedencia.isNullOrBlank()) {
                    Row(verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Icon(Icons.Default.Info, null, tint = TextSecondary,
                            modifier = Modifier.size(14.dp))
                        Text("Procedencia: ${resto.procedencia}",
                            style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                    }
                }

                // Instrucciones para llegar (con coordenadas si las hay)
                val lat = resto.unidad?.latitud
                val lon = resto.unidad?.longitud
                if (lat != null && lon != null) {
                    val context = androidx.compose.ui.platform.LocalContext.current
                    Button(
                        onClick = {
                            val intent = android.content.Intent(
                                android.content.Intent.ACTION_VIEW,
                                android.net.Uri.parse("geo:$lat,$lon?q=$lat,$lon(${resto.unidad?.codigo ?: "Nicho"})")
                            )
                            context.startActivity(intent)
                        },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = NichoOcupado, contentColor = Color.White)
                    ) {
                        Icon(Icons.Default.Navigation, null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Cómo llegar con GPS", fontWeight = FontWeight.Bold)
                    }
                } else {
                    Box(modifier = Modifier.fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(SurfaceSunken)
                        .padding(12.dp),
                        contentAlignment = Alignment.Center) {
                        Row(verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Icon(Icons.Default.Info, null, tint = TextDisabled,
                                modifier = Modifier.size(16.dp))
                            Text("Para más información diríjase a las oficinas municipales",
                                style = MaterialTheme.typography.bodySmall, color = TextDisabled,
                                textAlign = TextAlign.Center)
                        }
                    }
                }
            }
        }
    }
}
