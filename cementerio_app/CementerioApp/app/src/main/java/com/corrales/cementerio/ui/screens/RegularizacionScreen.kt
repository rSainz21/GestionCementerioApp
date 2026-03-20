package com.corrales.cementerio.ui.screens

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
import androidx.compose.ui.unit.*
import com.corrales.cementerio.data.model.RestosResponse
import com.corrales.cementerio.data.repository.CementerioRepository
import com.corrales.cementerio.ui.components.*
import com.corrales.cementerio.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun RegularizacionScreen(onBack: () -> Unit = {}) {
    val scope      = rememberCoroutineScope()
    var huerfanos  by remember { mutableStateOf<List<RestosResponse>>(emptyList()) }
    var isLoading  by remember { mutableStateOf(true) }
    var query      by remember { mutableStateOf("") }
    var mensaje    by remember { mutableStateOf("") }
    var errorVincular by remember { mutableStateOf("") }

    fun cargar() {
        scope.launch {
            isLoading = true
            CementerioRepository.getRestosHuerfanos()
                .onSuccess { huerfanos = it; isLoading = false }
                .onFailure { isLoading = false }
        }
    }

    LaunchedEffect(Unit) { cargar() }

    val filtrados = if (query.isBlank()) huerfanos
    else huerfanos.filter { it.nombreApellidos.contains(query, ignoreCase = true) }

    CementerioBackground {
        Column(modifier = Modifier.fillMaxSize()) {
            // Header
            Box(modifier = Modifier.fillMaxWidth().background(NavyMid).padding(horizontal = 20.dp, vertical = 14.dp)) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, null, tint = GoldPrimary) }
                        Column(modifier = Modifier.weight(1f)) {
                            Text("BANDEJA DE REGULARIZACIÓN", style = MaterialTheme.typography.labelSmall, color = GoldPrimary, fontWeight = FontWeight.Bold, letterSpacing = 1.5.sp)
                            Text("${filtrados.size} registros sin ubicar", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                        }
                    }
                    SearchField(value = query, onValueChange = { query = it }, placeholder = "Buscar difunto...")
                }
            }

            // Banner informativo
            Row(
                modifier = Modifier.fillMaxWidth().background(NichoPendiente.copy(0.15f)).padding(horizontal = 16.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.Info, null, tint = NichoPendiente, modifier = Modifier.size(18.dp))
                Text(
                    "Registros de libros históricos sin ubicación física. Vincúlalos tras verificar en campo.",
                    style = MaterialTheme.typography.bodySmall,
                    color = NichoPendiente
                )
            }

            // Mensaje de éxito
            if (mensaje.isNotBlank()) {
                Row(
                    modifier = Modifier.fillMaxWidth().background(AlertGreen.copy(0.15f)).padding(12.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.CheckCircle, null, tint = AlertGreen, modifier = Modifier.size(18.dp))
                    Text(mensaje, style = MaterialTheme.typography.bodySmall, color = AlertGreen)
                }
            }

            when {
                isLoading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = GoldPrimary)
                }
                filtrados.isEmpty() -> Box(Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Icon(Icons.Default.CheckCircle, null, tint = AlertGreen, modifier = Modifier.size(56.dp))
                        Text("¡Sin registros huérfanos!", style = MaterialTheme.typography.titleMedium, color = AlertGreen)
                        Text("Todos los restos tienen ubicación asignada", color = TextSecondary, style = MaterialTheme.typography.bodySmall)
                    }
                }
                else -> LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(bottom = 100.dp)
                ) {
                    items(filtrados, key = { it.id ?: it.hashCode() }) { resto ->
                        RestoHuerfanoCard(
                            resto = resto,
                            onVincular = { unidadId ->
                                scope.launch {
                                    CementerioRepository.vincularResto(resto.id ?: return@launch, unidadId)
                                        .onSuccess {
                                            mensaje = "✓ ${resto.nombreApellidos} vinculado al nicho #$unidadId"
                                            cargar()
                                        }
                                        .onFailure { errorVincular = it.message ?: "Error al vincular" }
                                }
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun RestoHuerfanoCard(
    resto: RestosResponse,
    onVincular: (Int) -> Unit
) {
    var showDialog  by remember { mutableStateOf(false) }
    var unidadInput by remember { mutableStateOf("") }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(SurfaceCard)
            .border(1.dp, NichoPendiente.copy(0.4f), RoundedCornerShape(12.dp))
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Box(
            modifier = Modifier.size(42.dp).clip(RoundedCornerShape(10.dp))
                .background(NichoPendiente.copy(0.15f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(Icons.Default.PersonSearch, null, tint = NichoPendiente, modifier = Modifier.size(22.dp))
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(resto.nombreApellidos, style = MaterialTheme.typography.bodyMedium, color = TextPrimary, fontWeight = FontWeight.SemiBold)
            Text(resto.fechaInhumacion ?: "Fecha desconocida", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
            if (!resto.procedencia.isNullOrBlank()) {
                Text(resto.procedencia, style = MaterialTheme.typography.labelSmall, color = TextDisabled)
            }
        }
        Button(
            onClick = { showDialog = true },
            shape = RoundedCornerShape(10.dp),
            colors = ButtonDefaults.buttonColors(containerColor = NichoPendiente, contentColor = TextPrimary),
            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
        ) {
            Icon(Icons.Default.Link, null, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(4.dp))
            Text("Ubicar", style = MaterialTheme.typography.labelSmall)
        }
    }

    if (showDialog) {
        AlertDialog(
            onDismissRequest = { showDialog = false; unidadInput = "" },
            containerColor = NavyMid,
            icon = { Icon(Icons.Default.LocationOn, null, tint = GoldPrimary, modifier = Modifier.size(32.dp)) },
            title = { Text("Vincular a nicho", color = TextPrimary, fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Introduce el ID del nicho verificado en campo para:", color = TextSecondary, style = MaterialTheme.typography.bodySmall)
                    Text(resto.nombreApellidos, color = GoldPrimary, fontWeight = FontWeight.Bold)
                    OutlinedTextField(
                        value = unidadInput,
                        onValueChange = { unidadInput = it },
                        placeholder = { Text("ID del nicho (ej: 42)", color = TextDisabled) },
                        singleLine = true,
                        shape = RoundedCornerShape(10.dp),
                        colors = loginFieldColors()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        unidadInput.toIntOrNull()?.let {
                            onVincular(it)
                            showDialog = false
                            unidadInput = ""
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = GoldPrimary, contentColor = NavyDeep),
                    enabled = unidadInput.toIntOrNull() != null
                ) { Text("Vincular", fontWeight = FontWeight.Bold) }
            },
            dismissButton = {
                TextButton(onClick = { showDialog = false; unidadInput = "" }) {
                    Text("Cancelar", color = TextSecondary)
                }
            }
        )
    }
}
