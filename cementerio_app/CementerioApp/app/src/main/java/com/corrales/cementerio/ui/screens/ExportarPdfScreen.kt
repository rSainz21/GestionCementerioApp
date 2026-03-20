package com.corrales.cementerio.ui.screens

import android.content.Intent
import android.os.Environment
import androidx.core.content.FileProvider
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.*
import com.corrales.cementerio.data.model.*
import com.corrales.cementerio.data.repository.CementerioRepository
import com.corrales.cementerio.ui.components.*
import com.corrales.cementerio.ui.theme.*
import com.itextpdf.text.*
import com.itextpdf.text.pdf.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.time.LocalDate
import java.time.format.DateTimeFormatter

/**
 * Pantalla de exportación de informes PDF.
 */
private data class ReporteItem(
    val tipo: String,
    val titulo: String,
    val desc: String,
    val icon: androidx.compose.ui.graphics.vector.ImageVector
)

@Composable
fun ExportarPdfScreen(onBack: () -> Unit = {}) {
    val context = LocalContext.current
    val scope   = rememberCoroutineScope()
    val fmt     = DateTimeFormatter.ofPattern("dd/MM/yyyy")
    val fmtFile = DateTimeFormatter.ofPattern("yyyyMMdd")

    var generando   by remember { mutableStateOf(false) }
    var tipoActual  by remember { mutableStateOf("") }
    var resultado   by remember { mutableStateOf("") }
    var pdfFile     by remember { mutableStateOf<File?>(null) }

    fun generarPdf(tipo: String) {
        generando = true; tipoActual = tipo; resultado = ""; pdfFile = null
        scope.launch {
            withContext(Dispatchers.IO) {
                try {
                    val hoy       = LocalDate.now()
                    val nombreFich = "Informe_${tipo}_${hoy.format(fmtFile)}.pdf"
                    val outDir    = context.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS)
                        ?: context.filesDir
                    val file      = File(outDir, nombreFich)
                    val doc       = Document(PageSize.A4, 40f, 40f, 60f, 40f)
                    PdfWriter.getInstance(doc, FileOutputStream(file))
                    doc.open()

                    // Fuentes
                    val fontTitulo  = Font(Font.FontFamily.HELVETICA, 18f, Font.BOLD, BaseColor(201,168,76))
                    val fontHeader  = Font(Font.FontFamily.HELVETICA, 11f, Font.BOLD, BaseColor.WHITE)
                    val fontNormal  = Font(Font.FontFamily.HELVETICA, 9f,  Font.NORMAL, BaseColor.DARK_GRAY)
                    val fontBold    = Font(Font.FontFamily.HELVETICA, 9f,  Font.BOLD,   BaseColor.DARK_GRAY)
                    val fontPeq     = Font(Font.FontFamily.HELVETICA, 8f,  Font.NORMAL, BaseColor.GRAY)

                    // Cabecera del documento
                    val cabecera = PdfPTable(1).apply { widthPercentage = 100f }
                    val celdaCab = PdfPCell(Phrase("AYUNTAMIENTO DE LOS CORRALES DE BUELNA\n" +
                        "Sistema de Gestión de Cementerios Municipales", fontTitulo)).apply {
                        backgroundColor = BaseColor(10, 22, 40)
                        border = Rectangle.NO_BORDER
                    }
                    cabecera.addCell(celdaCab)
                    doc.add(cabecera)
                    doc.add(Chunk.NEWLINE)

                    // Fecha y tipo
                    doc.add(Paragraph("Informe: $tipo", fontBold))
                    doc.add(Paragraph("Fecha de generación: ${hoy.format(fmt)}", fontPeq))
                    doc.add(Paragraph("Generado por el Sistema de Gestión Digital de Cementerios", fontPeq))
                    doc.add(Chunk.NEWLINE)

                    when (tipo) {
                        "OCUPACION" -> {
                            val unidades = CementerioRepository.listarTodasUnidades().getOrDefault(emptyList())
                            val ocupados  = unidades.count { it.estado?.uppercase() == "OCUPADO" }
                            val libres    = unidades.count { it.estado?.uppercase() == "LIBRE" }
                            val caducados = unidades.count { it.estado?.uppercase() == "CADUCADO" }

                            doc.add(Paragraph("INFORME DE OCUPACIÓN DEL CEMENTERIO", fontBold))
                            doc.add(Chunk.NEWLINE)

                            val tabla = PdfPTable(2).apply {
                                widthPercentage = 60f
                                setWidths(floatArrayOf(3f, 1f))
                            }
                            fun addFila(label: String, valor: String, highlight: Boolean = false) {
                                val bg = if (highlight) BaseColor(201, 168, 76, 40) else BaseColor.WHITE
                                tabla.addCell(PdfPCell(Phrase(label, fontBold)).apply { backgroundColor = bg; })
                                tabla.addCell(PdfPCell(Phrase(valor, fontBold)).apply { backgroundColor = bg; horizontalAlignment = Element.ALIGN_CENTER })
                            }
                            addFila("Total de unidades", "${unidades.size}", true)
                            addFila("Ocupadas", "$ocupados")
                            addFila("Libres", "$libres")
                            addFila("Caducadas", "$caducados")
                            addFila("Tasa de ocupación", "${if(unidades.isNotEmpty()) ocupados*100/unidades.size else 0}%", true)
                            doc.add(tabla)
                        }

                        "IMPAGOS" -> {
                            val tasas = CementerioRepository.getTasasImpagadas().getOrDefault(emptyList())
                            doc.add(Paragraph("LISTADO DE TASAS IMPAGADAS — EXPEDIENTE DE COBRO", fontBold))
                            doc.add(Paragraph("Total de registros: ${tasas.size}", fontNormal))
                            doc.add(Chunk.NEWLINE)

                            if (tasas.isNotEmpty()) {
                                val tabla = PdfPTable(5).apply {
                                    widthPercentage = 100f
                                    setWidths(floatArrayOf(2f, 3f, 2f, 1.5f, 1.5f))
                                }
                                listOf("Nicho", "Titular", "Concepto", "Importe", "Emisión").forEach {
                                    tabla.addCell(PdfPCell(Phrase(it, fontHeader)).apply {
                                        backgroundColor = BaseColor(10, 22, 40); })
                                }
                                tasas.forEach { t ->
                                    tabla.addCell(PdfPCell(Phrase(t.unidad?.codigo ?: "—", fontNormal)).apply {  })
                                    tabla.addCell(PdfPCell(Phrase(t.titular?.nombreApellidos ?: "—", fontNormal)).apply {  })
                                    tabla.addCell(PdfPCell(Phrase(t.concepto, fontNormal)).apply {  })
                                    tabla.addCell(PdfPCell(Phrase("%.2f €".format(t.importe), fontBold)).apply { horizontalAlignment = Element.ALIGN_RIGHT })
                                    tabla.addCell(PdfPCell(Phrase(t.fechaEmision, fontNormal)).apply { })
                                }
                                doc.add(tabla)
                                doc.add(Chunk.NEWLINE)
                                val total = tasas.sumOf { it.importe }
                                doc.add(Paragraph("TOTAL PENDIENTE DE COBRO: ${"%.2f €".format(total)}", fontBold))
                            }
                        }

                        "VENCIMIENTOS" -> {
                            val concesiones = CementerioRepository.getAlertasCaducidad(12).getOrDefault(emptyList())
                            doc.add(Paragraph("CONCESIONES PRÓXIMAS A VENCER (12 MESES)", fontBold))
                            doc.add(Paragraph("Requieren notificación a los titulares", fontNormal))
                            doc.add(Chunk.NEWLINE)

                            if (concesiones.isNotEmpty()) {
                                val tabla = PdfPTable(4).apply {
                                    widthPercentage = 100f
                                    setWidths(floatArrayOf(2f, 3f, 2f, 2f))
                                }
                                listOf("Nicho", "Titular", "Vencimiento", "Estado").forEach {
                                    tabla.addCell(PdfPCell(Phrase(it, fontHeader)).apply {
                                        backgroundColor = BaseColor(10, 22, 40); })
                                }
                                concesiones.forEach { c ->
                                    tabla.addCell(PdfPCell(Phrase(c.unidad?.codigo ?: "—", fontNormal)).apply { })
                                    tabla.addCell(PdfPCell(Phrase(c.titular?.nombreApellidos ?: "—", fontNormal)).apply {  })
                                    tabla.addCell(PdfPCell(Phrase(c.fechaVencimiento ?: "—", fontBold)).apply { })
                                    tabla.addCell(PdfPCell(Phrase(c.estado ?: "—", fontNormal)).apply {  })
                                }
                                doc.add(tabla)
                            }
                        }

                        "HUERFANOS" -> {
                            val huerfanos = CementerioRepository.getRestosHuerfanos().getOrDefault(emptyList())
                            doc.add(Paragraph("REGISTROS SIN UBICACIÓN — BANDEJA DE REGULARIZACIÓN", fontBold))
                            doc.add(Paragraph("Pendientes de verificación en campo", fontNormal))
                            doc.add(Chunk.NEWLINE)

                            if (huerfanos.isNotEmpty()) {
                                val tabla = PdfPTable(3).apply {
                                    widthPercentage = 100f
                                    setWidths(floatArrayOf(3f, 2f, 3f))
                                }
                                listOf("Nombre y Apellidos", "Fecha Inhumación", "Notas históricas").forEach {
                                    tabla.addCell(PdfPCell(Phrase(it, fontHeader)).apply {
                                        backgroundColor = BaseColor(10, 22, 40); })
                                }
                                huerfanos.forEach { r ->
                                    tabla.addCell(PdfPCell(Phrase(r.nombreApellidos, fontNormal)).apply { })
                                    tabla.addCell(PdfPCell(Phrase(r.fechaInhumacion ?: "—", fontNormal)).apply { })
                                    tabla.addCell(PdfPCell(Phrase(r.notasHistoricas?.take(80) ?: "—", fontPeq)).apply { })
                                }
                                doc.add(tabla)
                            }
                        }
                    }

                    doc.add(Chunk.NEWLINE)
                    doc.add(Paragraph("─".repeat(80), fontPeq))
                    doc.add(Paragraph("Documento generado automáticamente por el Sistema de Gestión de Cementerios", fontPeq))
                    doc.add(Paragraph("Ayuntamiento de Los Corrales de Buelna · ${hoy.format(fmt)}", fontPeq))
                    doc.close()
                    pdfFile = file

                } catch (e: Exception) {
                    resultado = "Error al generar el PDF: ${e.message}"
                }
            }
            generando = false
            if (pdfFile != null) resultado = "✓ PDF generado correctamente"
        }
    }

    fun compartirPdf() {
        pdfFile?.let { file ->
            val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
            val intent = Intent(Intent.ACTION_SEND).apply {
                type = "application/pdf"
                putExtra(Intent.EXTRA_STREAM, uri)
                putExtra(Intent.EXTRA_SUBJECT, "Informe Cementerio — ${tipoActual}")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            context.startActivity(Intent.createChooser(intent, "Compartir informe PDF"))
        }
    }

    CementerioBackground {
        Column(modifier = Modifier.fillMaxSize()) {
            Box(modifier = Modifier.fillMaxWidth()
                .background(Brush.verticalGradient(listOf(NavyMid, NavyDeep)))
                .padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, null, tint = GoldPrimary)
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text("EXPORTAR INFORMES", style = MaterialTheme.typography.labelSmall,
                            color = GoldPrimary, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
                        Text("Documentos PDF oficiales",
                            style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                    }
                    Icon(Icons.Default.PictureAsPdf, null, tint = AlertRed,
                        modifier = Modifier.size(28.dp))
                }
            }

            Column(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState())
                .padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {

                Spacer(Modifier.height(4.dp))

                listOf(
                    ReporteItem("OCUPACION",   "Informe de Ocupación",
                        "Estadísticas globales de uso del cementerio: total de nichos, ocupación, disponibilidad y tasa de ocupación.",
                        Icons.Default.Analytics),
                    ReporteItem("IMPAGOS",     "Listado de Impagos",
                        "Relación completa de tasas impagadas con titular, nicho e importe. Para iniciar expedientes de cobro.",
                        Icons.Default.MoneyOff),
                    ReporteItem("VENCIMIENTOS","Vencimientos Próximos",
                        "Concesiones que vencen en los próximos 12 meses. Para notificar a los titulares.",
                        Icons.Default.Schedule),
                    ReporteItem("HUERFANOS",   "Registros Sin Ubicar",
                        "Difuntos procedentes de libros históricos pendientes de localización física en campo.",
                        Icons.Default.PersonSearch),
                ).forEach { item ->
                    GoldBorderCard(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                Box(modifier = Modifier.size(44.dp).clip(RoundedCornerShape(10.dp))
                                    .background(GoldPrimary.copy(0.15f)),
                                    contentAlignment = Alignment.Center) {
                                    Icon(item.icon, null, tint = GoldPrimary,
                                        modifier = Modifier.size(24.dp))
                                }
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(item.titulo, style = MaterialTheme.typography.titleMedium,
                                        color = TextPrimary, fontWeight = FontWeight.Bold)
                                    Text(item.desc, style = MaterialTheme.typography.bodySmall,
                                        color = TextSecondary)
                                }
                            }
                            Button(
                                onClick = { generarPdf(item.tipo) },
                                modifier = Modifier.fillMaxWidth(),
                                enabled = !generando,
                                shape = RoundedCornerShape(10.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (generando && tipoActual == item.tipo) SurfaceCard else GoldPrimary,
                                    contentColor = NavyDeep)
                            ) {
                                if (generando && tipoActual == item.tipo) {
                                    CircularProgressIndicator(Modifier.size(16.dp),
                                        color = GoldPrimary, strokeWidth = 2.dp)
                                    Spacer(Modifier.width(8.dp))
                                    Text("Generando PDF...", fontWeight = FontWeight.Bold)
                                } else {
                                    Icon(Icons.Default.PictureAsPdf, null,
                                        modifier = Modifier.size(18.dp))
                                    Spacer(Modifier.width(8.dp))
                                    Text("Generar PDF", fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }

                // Resultado
                AnimatedVisibility(visible = resultado.isNotBlank()) {
                    Column(modifier = Modifier.fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(if (resultado.startsWith("✓")) AlertGreen.copy(0.1f) else AlertRed.copy(0.1f))
                        .border(1.dp, if (resultado.startsWith("✓")) AlertGreen.copy(0.3f) else AlertRed.copy(0.3f), RoundedCornerShape(12.dp))
                        .padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Icon(
                                if (resultado.startsWith("✓")) Icons.Default.CheckCircle else Icons.Default.Error,
                                null,
                                tint = if (resultado.startsWith("✓")) AlertGreen else AlertRed,
                                modifier = Modifier.size(20.dp))
                            Text(resultado, style = MaterialTheme.typography.bodyMedium,
                                color = if (resultado.startsWith("✓")) AlertGreen else AlertRed,
                                fontWeight = FontWeight.SemiBold)
                        }
                        if (pdfFile != null) {
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Button(onClick = { compartirPdf() },
                                    modifier = Modifier.weight(1f),
                                    shape = RoundedCornerShape(10.dp),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = AlertGreen, contentColor = NavyDeep)) {
                                    Icon(Icons.Default.Share, null, modifier = Modifier.size(16.dp))
                                    Text("Compartir / Imprimir", fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }

                Spacer(Modifier.height(80.dp))
            }
        }
    }
}
