package com.corrales.cementerio.ui.components

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.*
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.corrales.cementerio.ui.theme.*

/**
 * Colores estándar para todos los OutlinedTextField de la app.
 * Antes estaba definido en NuevoNichoScreen.kt — movido aquí
 * para que cualquier pantalla pueda usarlo sin duplicar código.
 */
@Composable
fun cementerioFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor      = GoldPrimary,
    unfocusedBorderColor    = BorderSubtle,
    focusedContainerColor   = SurfaceCard,
    unfocusedContainerColor = SurfaceCard,
    focusedTextColor        = TextPrimary,
    unfocusedTextColor      = TextPrimary,
    cursorColor             = GoldPrimary,
    focusedLabelColor       = GoldPrimary
)

/**
 * Alias idéntico al anterior — loginFieldColors y cementerioFieldColors
 * comparten el mismo estilo visual. Centralizado aquí para evitar
 * referencias rotas entre ficheros.
 */
@Composable
fun loginFieldColors() = cementerioFieldColors()

/**
 * Sección de formulario con título, icono y borde dorado.
 * Usada en NuevoNichoScreen, NuevoTitularScreen y otras.
 */
@Composable
fun FormSection(
    title: String,
    icon: ImageVector,
    color: Color,
    content: @Composable ColumnScope.() -> Unit
) {
    GoldBorderCard(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(32.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(color.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(icon, null, tint = color, modifier = Modifier.size(17.dp))
                }
                Text(
                    title,
                    style = MaterialTheme.typography.titleMedium,
                    color = TextPrimary,
                    fontWeight = FontWeight.SemiBold
                )
            }
            HorizontalDivider(color = BorderSubtle)
            content()
        }
    }
}

/**
 * Campo de texto con etiqueta encima, estilo cementerio.
 * Usado en NuevoNichoScreen, NuevoTitularScreen y otras.
 */
@Composable
fun FormField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String = "",
    modifier: Modifier = Modifier,
    keyboardType: KeyboardType = KeyboardType.Text,
    minLines: Int = 1
) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(
            label,
            style = MaterialTheme.typography.labelLarge,
            color = TextSecondary
        )
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            placeholder = {
                Text(placeholder, color = TextDisabled, style = MaterialTheme.typography.bodySmall)
            },
            singleLine = minLines == 1,
            minLines = minLines,
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
            shape = RoundedCornerShape(10.dp),
            colors = cementerioFieldColors(),
            modifier = Modifier.fillMaxWidth()
        )
    }
}
