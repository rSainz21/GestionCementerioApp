package com.corrales.cementerio.ui.screens

import androidx.compose.animation.*
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.*
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.*
import com.corrales.cementerio.data.model.SessionData
import com.corrales.cementerio.data.repository.CementerioRepository
import com.corrales.cementerio.data.repository.SessionManager
import com.corrales.cementerio.ui.components.CementerioBackground
import com.corrales.cementerio.ui.theme.*
import kotlinx.coroutines.launch
import com.corrales.cementerio.ui.components.loginFieldColors

@Composable
fun LoginScreen(onLoginSuccess: () -> Unit) {
    var username    by remember { mutableStateOf("") }
    var password    by remember { mutableStateOf("") }
    var showPass    by remember { mutableStateOf(false) }
    var isLoading   by remember { mutableStateOf(false) }
    var errorMsg    by remember { mutableStateOf("") }
    val scope       = rememberCoroutineScope()

    CementerioBackground {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {

            // ── Cabecera institucional ────────────────────────────────────────
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        Brush.verticalGradient(listOf(NavyMid, NavyDeep))
                    )
                    .padding(top = 72.dp, bottom = 48.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Escudo/logo
                    Box(
                        modifier = Modifier
                            .size(90.dp)
                            .clip(CircleShape)
                            .background(GoldPrimary.copy(alpha = 0.12f))
                            .border(2.dp, GoldPrimary.copy(alpha = 0.6f), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.AccountBalance,
                            contentDescription = null,
                            tint = GoldPrimary,
                            modifier = Modifier.size(44.dp)
                        )
                    }

                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            "AYUNTAMIENTO",
                            style = MaterialTheme.typography.labelSmall,
                            color = GoldPrimary,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 3.sp
                        )
                        Text(
                            "Los Corrales de Buelna",
                            style = MaterialTheme.typography.displayMedium,
                            color = TextPrimary,
                            fontWeight = FontWeight.Bold,
                            textAlign = TextAlign.Center
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(
                            "Gestión de Cementerios Municipales",
                            style = MaterialTheme.typography.bodySmall,
                            color = TextSecondary,
                            textAlign = TextAlign.Center
                        )
                    }

                    // Línea dorada divisoria
                    Box(
                        modifier = Modifier
                            .width(120.dp)
                            .height(1.dp)
                            .background(
                                Brush.horizontalGradient(
                                    listOf(Color.Transparent, GoldPrimary, Color.Transparent)
                                )
                            )
                    )
                }
            }

            // ── Formulario de acceso ──────────────────────────────────────────
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 28.dp)
                    .padding(top = 36.dp, bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    "Acceso al sistema",
                    style = MaterialTheme.typography.titleLarge,
                    color = TextPrimary,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    "Introduce tus credenciales de operario o administrador",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary
                )

                Spacer(Modifier.height(4.dp))

                // Campo usuario
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("Usuario", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                    OutlinedTextField(
                        value = username,
                        onValueChange = { username = it; errorMsg = "" },
                        placeholder = { Text("Nombre de usuario", color = TextDisabled) },
                        leadingIcon = {
                            Icon(Icons.Default.Person, null, tint = GoldPrimary, modifier = Modifier.size(20.dp))
                        },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Text,
                            imeAction = ImeAction.Next
                        ),
                        shape = RoundedCornerShape(14.dp),
                        colors = loginFieldColors(),
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                // Campo contraseña
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("Contraseña", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it; errorMsg = "" },
                        placeholder = { Text("Contraseña", color = TextDisabled) },
                        leadingIcon = {
                            Icon(Icons.Default.Lock, null, tint = GoldPrimary, modifier = Modifier.size(20.dp))
                        },
                        trailingIcon = {
                            IconButton(onClick = { showPass = !showPass }) {
                                Icon(
                                    if (showPass) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                    null, tint = TextSecondary, modifier = Modifier.size(20.dp)
                                )
                            }
                        },
                        visualTransformation = if (showPass) VisualTransformation.None else PasswordVisualTransformation(),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Password,
                            imeAction = ImeAction.Done
                        ),
                        shape = RoundedCornerShape(14.dp),
                        colors = loginFieldColors(),
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                // Error
                AnimatedVisibility(visible = errorMsg.isNotBlank()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(AlertRed.copy(alpha = 0.12f))
                            .border(1.dp, AlertRed.copy(alpha = 0.4f), RoundedCornerShape(10.dp))
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Icon(Icons.Default.ErrorOutline, null, tint = AlertRed, modifier = Modifier.size(18.dp))
                        Text(errorMsg, style = MaterialTheme.typography.bodySmall, color = AlertRed)
                    }
                }

                Spacer(Modifier.height(4.dp))

                // Botón acceder
                Button(
                    onClick = {
                        if (username.isBlank() || password.isBlank()) {
                            errorMsg = "Introduce usuario y contraseña"
                            return@Button
                        }
                        isLoading = true
                        errorMsg = ""
                        scope.launch {
                            val result = CementerioRepository.login(username.trim(), password.trim())
                            isLoading = false
                            result.fold(
                                onSuccess = { session ->
                                    SessionManager.saveSession(session)
                                    onLoginSuccess()
                                },
                                onFailure = { e ->
                                    errorMsg = e.message ?: "Error de conexión. Verifica que la API esté activa."
                                }
                            )
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = GoldPrimary,
                        contentColor = NavyDeep
                    ),
                    enabled = !isLoading && username.isNotBlank() && password.isNotBlank()
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = NavyDeep,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Icon(Icons.Default.Login, null, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Entrar al sistema", fontWeight = FontWeight.Bold,
                            style = MaterialTheme.typography.labelLarge)
                    }
                }

                // Info de conexión
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(NavyLight.copy(alpha = 0.5f))
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Icon(Icons.Default.Info, null, tint = TextSecondary, modifier = Modifier.size(16.dp))
                    Column {
                        Text(
                            "Conectando a: 10.0.2.2:8080",
                            style = MaterialTheme.typography.labelSmall,
                            color = TextSecondary
                        )
                        Text(
                            "Cambia BASE_URL en RetrofitClient.kt para tu red",
                            style = MaterialTheme.typography.labelSmall,
                            color = TextDisabled
                        )
                    }
                }

                Spacer(Modifier.height(16.dp))

                // Pie
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(modifier = Modifier.size(6.dp).clip(CircleShape).background(AlertGreen))
                    Spacer(Modifier.width(6.dp))
                    Text(
                        "Sistema de Información Geográfica Municipal",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextDisabled,
                        textAlign = TextAlign.Center
                    )
                }
            }
        }
    }
}

