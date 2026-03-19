package com.corrales.cementerio.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.corrales.cementerio.data.model.EstadoNicho
import com.corrales.cementerio.data.model.TipoAlerta
import com.corrales.cementerio.data.model.UnidadEnterramiento
import com.corrales.cementerio.ui.theme.*

@Composable
fun CementerioBackground(content: @Composable BoxScope.() -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(colors = listOf(NavyDeep, SurfaceSunken, NavyMid))
            ),
        content = content
    )
}

@Composable
fun GoldBorderCard(
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    val shape = RoundedCornerShape(16.dp)
    val base = modifier
        .clip(shape)
        .background(SurfaceCard)
        .border(1.dp, BorderSubtle, shape)
    val mod = if (onClick != null) base.clickable(onClick = onClick) else base

    Box(modifier = mod) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(2.dp)
                .background(Brush.horizontalGradient(listOf(Color.Transparent, GoldPrimary, Color.Transparent)))
        )
        Column(modifier = Modifier.padding(top = 2.dp), content = content)
    }
}

@Composable
fun EstadoChip(estado: EstadoNicho, modifier: Modifier = Modifier) {
    val (bg, fg) = when (estado) {
        EstadoNicho.OCUPADO   -> NichoOcupado.copy(alpha = 0.25f) to NichoOcupado
        EstadoNicho.LIBRE     -> NichoLibre.copy(alpha = 0.25f)   to NichoLibre
        EstadoNicho.CADUCADO  -> NichoCaducado.copy(alpha = 0.25f) to NichoCaducado
        EstadoNicho.RESERVADO -> NichoReservado.copy(alpha = 0.25f) to NichoReservado
        EstadoNicho.PENDIENTE -> NichoPendiente.copy(alpha = 0.25f) to NichoPendiente
    }
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(50))
            .background(bg)
            .border(1.dp, fg.copy(alpha = 0.5f), RoundedCornerShape(50))
            .padding(horizontal = 10.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(5.dp)
    ) {
        Box(modifier = Modifier.size(7.dp).clip(CircleShape).background(fg))
        Text(estado.label, style = MaterialTheme.typography.labelSmall, color = fg, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
fun AlertaChip(tipo: TipoAlerta, modifier: Modifier = Modifier) {
    val (bg, fg) = when (tipo) {
        TipoAlerta.VENCIMIENTO_PROXIMO, TipoAlerta.CAMPO_PENDIENTE -> AlertAmber.copy(alpha = 0.2f) to AlertAmber
        TipoAlerta.VENCIMIENTO_HOY, TipoAlerta.IMPAGO -> AlertRed.copy(alpha = 0.2f) to AlertRed
        TipoAlerta.HUERFANO -> NichoPendiente.copy(alpha = 0.2f) to NichoPendiente
    }
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(6.dp))
            .background(bg)
            .padding(horizontal = 8.dp, vertical = 3.dp)
    ) {
        Text(tipo.label, style = MaterialTheme.typography.labelSmall, color = fg)
    }
}

@Composable
fun KpiCard(
    label: String,
    value: String,
    icon: @Composable () -> Unit,
    color: Color,
    modifier: Modifier = Modifier
) {
    GoldBorderCard(modifier = modifier) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Box(
                modifier = Modifier.size(44.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(color.copy(alpha = 0.18f))
                    .border(1.dp, color.copy(alpha = 0.4f), RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center
            ) {
                CompositionLocalProvider(LocalContentColor provides color) { icon() }
            }
            Column {
                Text(value, style = MaterialTheme.typography.displayMedium, color = TextPrimary, fontWeight = FontWeight.Bold)
                Text(label, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
            }
        }
    }
}

@Composable
fun SectionHeader(title: String, trailing: @Composable (() -> Unit)? = null) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Box(modifier = Modifier.width(3.dp).height(20.dp).clip(RoundedCornerShape(2.dp)).background(GoldPrimary))
            Text(title, style = MaterialTheme.typography.titleMedium, color = TextPrimary, fontWeight = FontWeight.SemiBold)
        }
        trailing?.invoke()
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CementerioTopBar(
    title: String,
    subtitle: String? = null,
    navigationIcon: @Composable (() -> Unit)? = null,
    actions: @Composable RowScope.() -> Unit = {}
) {
    TopAppBar(
        title = {
            Column {
                Text(title, style = MaterialTheme.typography.titleLarge, color = TextPrimary, fontWeight = FontWeight.Bold)
                if (subtitle != null) Text(subtitle, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
            }
        },
        navigationIcon = { navigationIcon?.invoke() },
        actions = actions,
        colors = TopAppBarDefaults.topAppBarColors(
            containerColor = NavyDeep,
            titleContentColor = TextPrimary,
            actionIconContentColor = GoldPrimary
        )
    )
}

data class NavItem(val route: String, val label: String, val icon: ImageVector)

@Composable
fun CementerioBottomNav(items: List<NavItem>, currentRoute: String, onItemClick: (String) -> Unit) {
    NavigationBar(
        containerColor = SurfaceCard,
        tonalElevation = 0.dp,
        modifier = Modifier
            .clip(RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp))
            .border(BorderStroke(1.dp, BorderSubtle), RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp))
    ) {
        items.forEach { item ->
            val selected = currentRoute == item.route
            NavigationBarItem(
                selected = selected,
                onClick = { onItemClick(item.route) },
                icon = { Icon(item.icon, item.label, tint = if (selected) GoldPrimary else TextSecondary) },
                label = { Text(item.label, style = MaterialTheme.typography.labelSmall, color = if (selected) GoldPrimary else TextSecondary) },
                colors = NavigationBarItemDefaults.colors(indicatorColor = GoldPrimary.copy(alpha = 0.15f))
            )
        }
    }
}

@Composable
fun SearchField(value: String, onValueChange: (String) -> Unit, placeholder: String = "Buscar nicho, titular...", modifier: Modifier = Modifier) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        placeholder = { Text(placeholder, color = TextDisabled) },
        leadingIcon = { Icon(Icons.Default.Search, null, tint = GoldPrimary) },
        trailingIcon = {
            if (value.isNotEmpty()) IconButton(onClick = { onValueChange("") }) {
                Icon(Icons.Default.Close, null, tint = TextSecondary)
            }
        },
        singleLine = true,
        shape = RoundedCornerShape(14.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = GoldPrimary, unfocusedBorderColor = BorderSubtle,
            focusedContainerColor = SurfaceCard, unfocusedContainerColor = SurfaceCard,
            focusedTextColor = TextPrimary, unfocusedTextColor = TextPrimary, cursorColor = GoldPrimary
        ),
        modifier = modifier.fillMaxWidth()
    )
}

@Composable
fun MiniStat(value: String, label: String, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, style = MaterialTheme.typography.titleMedium, color = color, fontWeight = FontWeight.Bold)
        Text(label, style = MaterialTheme.typography.labelSmall, color = TextSecondary)
    }
}

@Composable
fun NichoListCard(unidad: UnidadEnterramiento, onClick: () -> Unit) {
    val color = when (unidad.estado) {
        EstadoNicho.OCUPADO   -> NichoOcupado
        EstadoNicho.LIBRE     -> NichoLibre
        EstadoNicho.CADUCADO  -> NichoCaducado
        EstadoNicho.RESERVADO -> NichoReservado
        EstadoNicho.PENDIENTE -> NichoPendiente
    }
    GoldBorderCard(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 5.dp),
        onClick = onClick
    ) {
        Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            Box(modifier = Modifier.width(4.dp).height(56.dp).clip(RoundedCornerShape(2.dp)).background(color))
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(unidad.codigo, style = MaterialTheme.typography.titleMedium, color = TextPrimary, fontWeight = FontWeight.Bold)
                    if (unidad.esHuerfano) {
                        Box(modifier = Modifier.clip(RoundedCornerShape(4.dp)).background(NichoPendiente.copy(alpha = 0.2f)).padding(horizontal = 6.dp, vertical = 2.dp)) {
                            Text("HUÉRFANO", style = MaterialTheme.typography.labelSmall, color = NichoPendiente, fontWeight = FontWeight.Bold)
                        }
                    }
                }
                Text(unidad.bloque, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                unidad.difuntos.lastOrNull()?.let {
                    Text("${it.nombre} ${it.apellidos}", style = MaterialTheme.typography.bodyMedium, color = TextPrimary)
                }
            }
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(6.dp)) {
                EstadoChip(unidad.estado)
                unidad.concesion?.let {
                    Text("Vence: ${it.fechaVencimiento.year}", style = MaterialTheme.typography.labelSmall, color = TextSecondary)
                }
            }
        }
    }
}

@Composable
fun FilterChipCustom(selected: Boolean, label: String, onClick: () -> Unit, color: Color = GoldPrimary) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(if (selected) color.copy(alpha = 0.2f) else SurfaceCard)
            .border(1.dp, if (selected) color else BorderSubtle, RoundedCornerShape(50))
            .clickable { onClick() }
            .padding(horizontal = 12.dp, vertical = 6.dp)
    ) {
        Text(label, style = MaterialTheme.typography.labelLarge,
            color = if (selected) color else TextSecondary,
            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal)
    }
}
