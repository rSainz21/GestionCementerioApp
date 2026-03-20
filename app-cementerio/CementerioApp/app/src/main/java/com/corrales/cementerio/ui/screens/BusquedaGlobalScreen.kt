package com.corrales.cementerio.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.corrales.cementerio.data.model.*
import com.corrales.cementerio.data.repository.CementerioRepository
import com.corrales.cementerio.ui.components.*
import com.corrales.cementerio.ui.theme.*
import kotlinx.coroutines.launch

/**
 * Búsqueda global: encuentra difuntos, nichos y titulares de toda la BD.
 * Accesible desde el Dashboard o el icono de búsqueda.
 */
@Composable
fun BusquedaGlobalScreen(
    onNichoClick: (Int) -> Unit = {},
    onBack: () -> Unit = {}
) {
    val scope = rememberCoroutineScope()
    var query         by remember { mutableStateOf("") }
    var restos        by remember { mutableStateOf<List<RestosResponse>>(emptyList()) }
    var unidades      by remember { mutableStateOf<List<UnidadResponse>>(emptyList()) }
    var buscando      by remember { mutableStateOf(false) }
    var haBuscado     by remember { mutableStateOf(false) }
    var tabSelec      by remember { mutableIntStateOf(0) }

    fun buscar(q: String) {
        if (q.length < 2) return
        buscando = true; haBuscado = true
        scope.launch {
            CementerioRepository.buscarRestosPorNombre(q).onSuccess { restos = it }
            CementerioRepository.listarTodasUnidades().onSuccess { lista ->
                unidades = lista.filter {
                    it.codigo?.contains(q, ignoreCase = true) == true ||
                    it.tipo?.contains(q, ignoreCase = true) == true
                }
            }
            buscando = false
        }
    }

    CementerioBackground {
        Column(modifier = Modifier.fillMaxSize()) {

            // ── Cabecera ──────────────────────────────────────────────────────
            Box(modifier = Modifier.fillMaxWidth().background(NavyMid)
                .padding(horizontal = 16.dp, vertical = 14.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, null, tint = GoldPrimary)
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text("BÚSQUEDA GLOBAL", style = MaterialTheme.typography.labelSmall,
                            color = GoldPrimary, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
                        Text("Difuntos, nichos y titulares",
                            style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                    }
                }
            }

            // ── Campo de búsqueda ─────────────────────────────────────────────
            Box(modifier = Modifier.fillMaxWidth().background(SurfaceCard)
                .padding(horizontal = 16.dp, vertical = 10.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically) {
                    SearchField(
                        value = query,
                        onValueChange = { query = it },
                        placeholder = "Nombre, apellidos, código de nicho...",
                        modifier = Modifier.weight(1f)
                    )
                    Button(
                        onClick = { buscar(query) },
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = GoldPrimary, contentColor = NavyDeep)
                    ) {
                        if (buscando)
                            CircularProgressIndicator(Modifier.size(18.dp), color = NavyDeep, strokeWidth = 2.dp)
                        else
                            Icon(Icons.Default.Search, null, modifier = Modifier.size(20.dp))
                    }
                }
            }

            // ── Tabs de resultados ────────────────────────────────────────────
            if (haBuscado) {
                TabRow(selectedTabIndex = tabSelec,
                    containerColor = SurfaceCard, contentColor = GoldPrimary,
                    indicator = { pos ->
                        TabRowDefaults.SecondaryIndicator(
                            Modifier.tabIndicatorOffset(pos[tabSelec]), color = GoldPrimary)
                    }) {
                    Tab(selected = tabSelec == 0, onClick = { tabSelec = 0 },
                        text = {
                            Text("Difuntos (${restos.size})",
                                color = if (tabSelec == 0) GoldPrimary else TextSecondary,
                                style = MaterialTheme.typography.labelLarge)
                        })
                    Tab(selected = tabSelec == 1, onClick = { tabSelec = 1 },
                        text = {
                            Text("Nichos (${unidades.size})",
                                color = if (tabSelec == 1) GoldPrimary else TextSecondary,
                                style = MaterialTheme.typography.labelLarge)
                        })
                }

                LazyColumn(modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(bottom = 80.dp)) {

                    if (tabSelec == 0) {
                        if (restos.isEmpty() && !buscando) {
                            item { EmptyBusqueda("difuntos", query) }
                        }
                        items(restos, key = { it.id ?: it.hashCode() }) { resto ->
                            ResultadoRestoCard(resto, onNichoClick)
                        }
                    } else {
                        if (unidades.isEmpty() && !buscando) {
                            item { EmptyBusqueda("nichos", query) }
                        }
                        items(unidades, key = { it.id ?: it.hashCode() }) { u ->
                            ResultadoNichoCard(u) { u.id?.let { onNichoClick(it) } }
                        }
                    }
                }
            } else {
                // Estado inicial
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                        modifier = Modifier.padding(32.dp)) {
                        Icon(Icons.Default.ManageSearch, null,
                            tint = GoldPrimary.copy(0.4f), modifier = Modifier.size(72.dp))
                        Text("Busca cualquier registro", style = MaterialTheme.typography.titleMedium,
                            color = TextSecondary)
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            listOf(
                                Icons.Default.Person      to "Nombre o apellidos del difunto",
                                Icons.Default.GridView    to "Código del nicho (ej: SJ-F1-N5)",
                                Icons.Default.Badge       to "Nombre del titular",
                            ).forEach { (icon, hint) ->
                                Row(verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(SurfaceCard)
                                        .padding(10.dp)) {
                                    Icon(icon, null, tint = GoldPrimary, modifier = Modifier.size(16.dp))
                                    Text(hint, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ResultadoRestoCard(resto: RestosResponse, onNichoClick: (Int) -> Unit) {
    val tieneNicho = resto.unidad != null
    GoldBorderCard(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 5.dp),
        onClick   = if (tieneNicho) ({ resto.unidad!!.id?.let { onNichoClick(it) } }) else null
    ) {
        Row(modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(modifier = Modifier.size(44.dp).clip(RoundedCornerShape(10.dp))
                .background(NichoOcupado.copy(0.15f)), contentAlignment = Alignment.Center) {
                Icon(Icons.Default.Person, null, tint = NichoOcupado, modifier = Modifier.size(22.dp))
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(resto.nombreApellidos, style = MaterialTheme.typography.bodyMedium,
                    color = TextPrimary, fontWeight = FontWeight.Bold)
                Text(resto.fechaInhumacion?.let { "Inhumado: $it" } ?: "Fecha desconocida",
                    style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                if (tieneNicho) {
                    Text("Nicho: ${resto.unidad!!.codigo ?: "ID ${resto.unidad.id}"}",
                        style = MaterialTheme.typography.labelSmall, color = GoldPrimary,
                        fontWeight = FontWeight.SemiBold)
                } else {
                    Row(verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        Icon(Icons.Default.Warning, null, tint = NichoPendiente, modifier = Modifier.size(12.dp))
                        Text("Sin ubicación · Bandeja de Regularización",
                            style = MaterialTheme.typography.labelSmall, color = NichoPendiente)
                    }
                }
            }
            if (tieneNicho) Icon(Icons.Default.ChevronRight, null, tint = GoldPrimary)
        }
    }
}

@Composable
fun ResultadoNichoCard(unidad: UnidadResponse, onClick: () -> Unit) {
    val estadoUp = unidad.estado?.uppercase() ?: "LIBRE"
    val color = when (estadoUp) {
        "OCUPADO"   -> NichoOcupado;  "LIBRE"     -> NichoLibre
        "CADUCADO"  -> NichoCaducado; "RESERVADO" -> NichoReservado
        else        -> NichoPendiente
    }
    GoldBorderCard(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 5.dp),
        onClick = onClick) {
        Row(modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(modifier = Modifier.width(4.dp).height(48.dp)
                .clip(RoundedCornerShape(2.dp)).background(color))
            Column(modifier = Modifier.weight(1f)) {
                Text(unidad.codigo ?: "Nicho ${unidad.id}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextPrimary, fontWeight = FontWeight.Bold)
                Text("Fila ${unidad.fila ?: "—"} · Nº ${unidad.numero ?: "—"} · ${unidad.tipo ?: "Nicho"}",
                    style = MaterialTheme.typography.bodySmall, color = TextSecondary)
            }
            Box(modifier = Modifier.clip(RoundedCornerShape(50))
                .background(color.copy(0.2f))
                .border(1.dp, color.copy(0.5f), RoundedCornerShape(50))
                .padding(horizontal = 10.dp, vertical = 4.dp)) {
                Text(unidad.estado?.lowercase()?.replaceFirstChar { it.uppercase() } ?: "Libre",
                    style = MaterialTheme.typography.labelSmall,
                    color = color, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@Composable
fun EmptyBusqueda(tipo: String, query: String) {
    Box(Modifier.fillMaxWidth().padding(48.dp), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Icon(Icons.Default.SearchOff, null, tint = TextDisabled, modifier = Modifier.size(48.dp))
            Text("Sin $tipo para \"$query\"",
                style = MaterialTheme.typography.titleMedium, color = TextSecondary)
        }
    }
}
