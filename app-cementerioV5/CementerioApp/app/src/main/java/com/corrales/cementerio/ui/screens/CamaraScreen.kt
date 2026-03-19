package com.corrales.cementerio.ui.screens

import android.Manifest
import android.content.Context
import android.net.Uri
import android.os.Environment
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.FileProvider
import com.corrales.cementerio.ui.components.*
import com.corrales.cementerio.ui.theme.*
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun CamaraScreen(
    codigoNicho: String = "SOM-B4-N140",
    onFotoGuardada: (Uri) -> Unit = {},
    onBack: () -> Unit = {}
) {
    val context = LocalContext.current
    var fotoUri by remember { mutableStateOf<Uri?>(null) }
    var fotoConfirmada by remember { mutableStateOf(false) }
    var permisoCamara by remember { mutableStateOf(false) }
    var mostrarDialogoExito by remember { mutableStateOf(false) }

    // Crear URI para la foto
    val tempFile = remember {
        File(context.getExternalFilesDir(Environment.DIRECTORY_PICTURES), "lapida_${System.currentTimeMillis()}.jpg")
    }
    val tempUri = remember(tempFile) {
        FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", tempFile)
    }

    // Launcher cámara
    val camaraLauncher = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { exito ->
        if (exito) { fotoUri = tempUri }
    }

    // Launcher permiso cámara
    val permisoLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        permisoCamara = granted
        if (granted) camaraLauncher.launch(tempUri)
    }

    // Launcher galería
    val galeriaLauncher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let { fotoUri = it }
    }

    CementerioBackground {
        Column(modifier = Modifier.fillMaxSize()) {

            // Header
            Box(modifier = Modifier.fillMaxWidth().background(NavyMid).padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, null, tint = GoldPrimary) }
                    Column {
                        Text("FOTOGRAFÍA DE LÁPIDA", style = MaterialTheme.typography.labelSmall,
                            color = GoldPrimary, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
                        Text(codigoNicho, style = MaterialTheme.typography.titleMedium, color = TextPrimary, fontWeight = FontWeight.Bold)
                    }
                }
            }

            Column(
                modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {

                // Preview de foto o placeholder
                Box(
                    modifier = Modifier.fillMaxWidth().height(280.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(SurfaceCard)
                        .border(2.dp, if (fotoUri != null) GoldPrimary else BorderSubtle, RoundedCornerShape(16.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    if (fotoUri != null) {
                        // Simulación de foto tomada (sin Coil para evitar dependencia)
                        Box(modifier = Modifier.fillMaxSize().background(SurfaceSunken), contentAlignment = Alignment.Center) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                Icon(Icons.Default.CheckCircle, null, tint = AlertGreen, modifier = Modifier.size(60.dp))
                                Text("✓ Foto capturada correctamente", style = MaterialTheme.typography.titleMedium,
                                    color = AlertGreen, fontWeight = FontWeight.Bold)
                                Text(codigoNicho, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                                Text(SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault()).format(Date()),
                                    style = MaterialTheme.typography.labelSmall, color = TextDisabled)
                            }
                        }
                        // Badge de confirmado
                        Box(modifier = Modifier.align(Alignment.TopEnd).padding(10.dp)
                            .clip(RoundedCornerShape(8.dp)).background(AlertGreen.copy(alpha = 0.9f)).padding(horizontal = 8.dp, vertical = 4.dp)) {
                            Text("NUEVA FOTO", style = MaterialTheme.typography.labelSmall, color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    } else {
                        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Box(modifier = Modifier.size(80.dp).clip(CircleShape).background(GoldPrimary.copy(alpha = 0.1f))
                                .border(2.dp, GoldPrimary.copy(alpha = 0.3f), CircleShape), contentAlignment = Alignment.Center) {
                                Icon(Icons.Default.PhotoCamera, null, tint = GoldPrimary, modifier = Modifier.size(40.dp))
                            }
                            Text("Sin foto aún", style = MaterialTheme.typography.titleMedium, color = TextSecondary)
                            Text("Toma o selecciona una foto de la lápida\npara añadirla al expediente",
                                style = MaterialTheme.typography.bodySmall, color = TextDisabled,
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                        }
                    }
                }

                // Botones de captura
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    // Cámara
                    Button(
                        onClick = { permisoLauncher.launch(Manifest.permission.CAMERA) },
                        modifier = Modifier.weight(1f).height(56.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = GoldPrimary, contentColor = NavyDeep)
                    ) {
                        Icon(Icons.Default.PhotoCamera, null, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Cámara", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelLarge)
                    }
                    // Galería
                    OutlinedButton(
                        onClick = { galeriaLauncher.launch("image/*") },
                        modifier = Modifier.weight(1f).height(56.dp),
                        shape = RoundedCornerShape(14.dp),
                        border = BorderStroke(1.dp, BorderActive)
                    ) {
                        Icon(Icons.Default.PhotoLibrary, null, tint = GoldPrimary, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Galería", color = GoldPrimary, style = MaterialTheme.typography.labelLarge)
                    }
                }

                // Instrucciones
                GoldBorderCard(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Icon(Icons.Default.Info, null, tint = GoldPrimary, modifier = Modifier.size(18.dp))
                            Text("Instrucciones de campo", style = MaterialTheme.typography.titleMedium, color = TextPrimary, fontWeight = FontWeight.SemiBold)
                        }
                        HorizontalDivider(color = BorderSubtle)
                        listOf(
                            "Encuadra la lápida completa en el marco",
                            "Asegúrate de que el nombre sea legible",
                            "Incluye el número de nicho si es visible",
                            "Fotografía el estado de conservación"
                        ).forEachIndexed { i, instruccion ->
                            Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                Box(modifier = Modifier.size(20.dp).clip(CircleShape).background(GoldPrimary.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
                                    Text("${i + 1}", style = MaterialTheme.typography.labelSmall, color = GoldPrimary, fontWeight = FontWeight.Bold)
                                }
                                Text(instruccion, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                            }
                        }
                    }
                }

                // Botón guardar
                if (fotoUri != null) {
                    Button(
                        onClick = {
                            onFotoGuardada(fotoUri!!)
                            mostrarDialogoExito = true
                        },
                        modifier = Modifier.fillMaxWidth().height(56.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = AlertGreen, contentColor = Color.White)
                    ) {
                        Icon(Icons.Default.Save, null, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Guardar en expediente", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelLarge)
                    }
                }

                Spacer(Modifier.height(80.dp))
            }
        }

        // Diálogo de éxito
        if (mostrarDialogoExito) {
            AlertDialog(
                onDismissRequest = { mostrarDialogoExito = false; onBack() },
                containerColor = NavyMid,
                icon = { Icon(Icons.Default.CheckCircle, null, tint = AlertGreen, modifier = Modifier.size(40.dp)) },
                title = { Text("¡Foto guardada!", color = TextPrimary, fontWeight = FontWeight.Bold) },
                text = { Text("La fotografía se ha adjuntado correctamente al expediente de $codigoNicho.", color = TextSecondary) },
                confirmButton = {
                    Button(onClick = { mostrarDialogoExito = false; onBack() },
                        colors = ButtonDefaults.buttonColors(containerColor = GoldPrimary, contentColor = NavyDeep)) {
                        Text("Aceptar", fontWeight = FontWeight.Bold)
                    }
                }
            )
        }
    }
}
