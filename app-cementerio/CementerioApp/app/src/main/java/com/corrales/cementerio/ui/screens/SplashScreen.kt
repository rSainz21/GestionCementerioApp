package com.corrales.cementerio.ui.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.draw.*
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.*
import com.corrales.cementerio.ui.theme.*
import kotlinx.coroutines.delay

@Composable
fun SplashScreen(onFinished: () -> Unit = {}) {

    // Animaciones
    val alphaAnim    by rememberInfiniteTransition(label = "").animateFloat(
        initialValue = 0f, targetValue = 0f, animationSpec = infiniteRepeatable(tween(1)), label = "")
    var alpha        by remember { mutableFloatStateOf(0f) }
    var escudoScale  by remember { mutableFloatStateOf(0.3f) }
    var textAlpha    by remember { mutableFloatStateOf(0f) }
    var lineWidth    by remember { mutableFloatStateOf(0f) }
    var subTextAlpha by remember { mutableFloatStateOf(0f) }

    val escudoAnimScale by animateFloatAsState(
        targetValue = escudoScale,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessLow),
        label = "escudo"
    )
    val alphaAnimated by animateFloatAsState(
        targetValue = alpha, animationSpec = tween(600), label = "alpha")
    val textAlphaAnim by animateFloatAsState(
        targetValue = textAlpha, animationSpec = tween(700), label = "text")
    val lineAnim by animateFloatAsState(
        targetValue = lineWidth, animationSpec = tween(800, easing = FastOutSlowInEasing), label = "line")
    val subTextAnim by animateFloatAsState(
        targetValue = subTextAlpha, animationSpec = tween(600), label = "sub")

    LaunchedEffect(Unit) {
        delay(100); alpha = 1f; escudoScale = 1f
        delay(500); textAlpha = 1f
        delay(300); lineWidth = 1f
        delay(200); subTextAlpha = 1f
        delay(1800); onFinished()
    }

    Box(
        modifier = Modifier.fillMaxSize()
            .background(Brush.verticalGradient(listOf(NavyDeep, NavyMid, NavyDeep))),
        contentAlignment = Alignment.Center
    ) {
        // Círculos decorativos de fondo
        Box(modifier = Modifier.size(400.dp).clip(CircleShape)
            .background(GoldPrimary.copy(alpha = 0.03f))
            .align(Alignment.Center))
        Box(modifier = Modifier.size(280.dp).clip(CircleShape)
            .background(GoldPrimary.copy(alpha = 0.05f))
            .align(Alignment.Center))

        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(20.dp),
            modifier = Modifier.alpha(alphaAnimated)
        ) {
            // Escudo del Ayuntamiento (simulado con icono oficial)
            Box(
                modifier = Modifier
                    .size(120.dp)
                    .scale(escudoAnimScale)
                    .clip(RoundedCornerShape(24.dp))
                    .background(Brush.radialGradient(listOf(GoldPrimary.copy(0.3f), GoldPrimary.copy(0.1f))))
                    .border(2.dp, GoldPrimary.copy(0.6f), RoundedCornerShape(24.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.AccountBalance, null,
                    tint = GoldPrimary, modifier = Modifier.size(64.dp))
            }

            // Título principal
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.alpha(textAlphaAnim)
            ) {
                Text("AYUNTAMIENTO", style = MaterialTheme.typography.labelLarge,
                    color = GoldPrimary, fontWeight = FontWeight.Bold, letterSpacing = 4.sp)
                Text("Los Corrales de Buelna",
                    style = MaterialTheme.typography.headlineMedium,
                    color = TextPrimary, fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center)
            }

            // Línea separadora animada
            Box(
                modifier = Modifier
                    .fillMaxWidth(lineAnim)
                    .height(1.dp)
                    .background(Brush.horizontalGradient(
                        listOf(Color.Transparent, GoldPrimary, Color.Transparent)))
            )

            // Subtítulo del sistema
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.alpha(subTextAnim)
            ) {
                Text("SISTEMA DE GESTIÓN DIGITAL",
                    style = MaterialTheme.typography.labelMedium,
                    color = GoldPrimary.copy(0.8f), letterSpacing = 2.sp)
                Text("Cementerios Municipales",
                    style = MaterialTheme.typography.titleMedium,
                    color = TextSecondary)
            }

            Spacer(Modifier.height(32.dp))

            // Indicador de carga
            CircularProgressIndicator(
                modifier = Modifier.size(24.dp).alpha(subTextAnim),
                color = GoldPrimary, strokeWidth = 2.dp
            )
        }

        // Versión en la parte inferior
        Text("v4.0 · 2024", style = MaterialTheme.typography.labelSmall,
            color = TextDisabled,
            modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 32.dp)
                .alpha(subTextAnim))
    }
}
