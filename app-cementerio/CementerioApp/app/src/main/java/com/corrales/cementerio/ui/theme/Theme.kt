package com.corrales.cementerio.ui.theme

import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

val CementerioTypography = Typography(
    displayLarge  = TextStyle(fontFamily = FontFamily.Serif,      fontWeight = FontWeight.Bold,      fontSize = 32.sp, lineHeight = 40.sp, letterSpacing = (-0.5).sp),
    displayMedium = TextStyle(fontFamily = FontFamily.Serif,      fontWeight = FontWeight.SemiBold,  fontSize = 24.sp, lineHeight = 32.sp),
    titleLarge    = TextStyle(fontFamily = FontFamily.SansSerif,  fontWeight = FontWeight.SemiBold,  fontSize = 20.sp, lineHeight = 28.sp, letterSpacing = 0.15.sp),
    titleMedium   = TextStyle(fontFamily = FontFamily.SansSerif,  fontWeight = FontWeight.Medium,    fontSize = 16.sp, lineHeight = 24.sp, letterSpacing = 0.1.sp),
    bodyLarge     = TextStyle(fontFamily = FontFamily.SansSerif,  fontWeight = FontWeight.Normal,    fontSize = 16.sp, lineHeight = 24.sp),
    bodyMedium    = TextStyle(fontFamily = FontFamily.SansSerif,  fontWeight = FontWeight.Normal,    fontSize = 14.sp, lineHeight = 20.sp),
    bodySmall     = TextStyle(fontFamily = FontFamily.SansSerif,  fontWeight = FontWeight.Normal,    fontSize = 12.sp, lineHeight = 16.sp, letterSpacing = 0.4.sp),
    labelLarge    = TextStyle(fontFamily = FontFamily.SansSerif,  fontWeight = FontWeight.Medium,    fontSize = 14.sp, letterSpacing = 0.1.sp),
    labelSmall    = TextStyle(fontFamily = FontFamily.SansSerif,  fontWeight = FontWeight.Medium,    fontSize = 10.sp, letterSpacing = 1.5.sp),
)

private val DarkColorScheme = darkColorScheme(
    primary               = GoldPrimary,
    onPrimary             = NavyDeep,
    primaryContainer      = GoldDim,
    onPrimaryContainer    = GoldLight,
    secondary             = NichoOcupado,
    onSecondary           = TextPrimary,
    secondaryContainer    = NavyLight,
    onSecondaryContainer  = TextPrimary,
    tertiary              = AlertGreen,
    onTertiary            = NavyDeep,
    background            = NavyDeep,
    onBackground          = TextPrimary,
    surface               = SurfaceCard,
    onSurface             = TextPrimary,
    surfaceVariant        = SurfaceElevated,
    onSurfaceVariant      = TextSecondary,
    outline               = BorderSubtle,
    outlineVariant        = BorderActive,
    error                 = AlertRed,
    onError               = TextPrimary,
)

@Composable
fun CementerioTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        typography  = CementerioTypography,
        content     = content
    )
}
