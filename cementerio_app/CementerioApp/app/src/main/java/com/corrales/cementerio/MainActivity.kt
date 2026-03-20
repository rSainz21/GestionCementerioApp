package com.corrales.cementerio

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.corrales.cementerio.data.model.UnidadResponse
import com.corrales.cementerio.data.repository.SessionManager
import com.corrales.cementerio.ui.components.CementerioBottomNav
import com.corrales.cementerio.ui.components.NavItem
import com.corrales.cementerio.ui.screens.*
import com.corrales.cementerio.ui.theme.CementerioTheme
import com.corrales.cementerio.ui.theme.NavyDeep

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        SessionManager.init(applicationContext)
        enableEdgeToEdge()
        setContent { CementerioTheme { CementerioApp() } }
    }
}

@Composable
fun CementerioApp() {
    val navController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route ?: "splash"

    val sinNavBar = listOf(
        "splash", "login", "nicho_detalle", "nuevo_nicho", "nuevo_titular",
        "camara", "bloque", "regularizacion", "tasas_economicas",
        "busqueda_global", "estadisticas", "exportar_pdf", "generar_qr",
        "portal_ciudadano"
    )
    val ocultarNav = sinNavBar.any { currentRoute.startsWith(it) }

    val navItems = listOf(
        NavItem("dashboard",  "Inicio",    Icons.Default.Dashboard),
        NavItem("mapa",       "Mapa",      Icons.Default.Map),
        NavItem("verificar",  "Verificar", Icons.Default.FactCheck),
        NavItem("nichos",     "Nichos",    Icons.Default.GridView),
        NavItem("alertas",    "Alertas",   Icons.Default.Notifications),
    )

    Scaffold(
        bottomBar = {
            if (!ocultarNav) {
                CementerioBottomNav(
                    items        = navItems,
                    currentRoute = currentRoute,
                    centralItem  = "verificar",
                    onItemClick  = { route ->
                        navController.navigate(route) {
                            popUpTo(navController.graph.startDestinationId) { saveState = true }
                            launchSingleTop = true
                            restoreState    = true
                        }
                    }
                )
            }
        },
        containerColor = NavyDeep
    ) { padding ->
        NavHost(
            navController    = navController,
            startDestination = "splash",
            modifier         = Modifier.padding(padding)
        ) {
            // ── Splash ────────────────────────────────────────────────────────
            composable("splash") {
                SplashScreen(onFinished = {
                    val dest = if (SessionManager.isLoggedIn()) "dashboard" else "login"
                    navController.navigate(dest) {
                        popUpTo("splash") { inclusive = true }
                    }
                })
            }

            // ── Login ─────────────────────────────────────────────────────────
            composable("login") {
                LoginScreen(onLoginSuccess = {
                    navController.navigate("dashboard") {
                        popUpTo("login") { inclusive = true }
                    }
                })
            }

            // ── Dashboard ─────────────────────────────────────────────────────
            composable("dashboard") {
                DashboardApiScreen(
                    onNavigate = { navController.navigate(it) },
                    onLogout   = {
                        SessionManager.clearSession()
                        navController.navigate("login") { popUpTo(0) { inclusive = true } }
                    }
                )
            }

            // ── Mapa ──────────────────────────────────────────────────────────
            composable("mapa") {
                MapaScreen(onNichoApiClick = { id -> navController.navigate("nicho_detalle/$id") })
            }

            // ── Verificar Nicho (pantalla central operarios) ───────────────────
            composable("verificar") {
                VerificarNichoScreen(
                    onVerExpediente = { id -> navController.navigate("nicho_detalle/$id") },
                    onNavegar       = { navController.navigate(it) }
                )
            }

            // ── Nichos ────────────────────────────────────────────────────────
            composable("nichos") {
                NichosScreen(
                    onNichoApiClick = { unidad ->
                        unidad.id?.let { navController.navigate("nicho_detalle/$it") }
                    }
                )
            }

            // ── Alertas ───────────────────────────────────────────────────────
            composable("alertas") {
                AlertasScreen(onNavigate = { navController.navigate(it) })
            }

            // ── Detalle de nicho ──────────────────────────────────────────────
            composable("nicho_detalle/{id}") { back ->
                val id = back.arguments?.getString("id")?.toIntOrNull() ?: return@composable
                NichoDetalleApiScreen(
                    unidad    = UnidadResponse(id = id),
                    onBack    = { navController.popBackStack() },
                    onNavegar = { navController.navigate(it) }
                )
            }

            // ── Nuevo nicho ───────────────────────────────────────────────────
            composable("nuevo_nicho") {
                NuevoNichoScreen(
                    onBack    = { navController.popBackStack() },
                    onGuardar = { navController.popBackStack() }
                )
            }

            // ── Nuevo titular ─────────────────────────────────────────────────
            composable("nuevo_titular/{codigo}") { back ->
                val codigo = back.arguments?.getString("codigo") ?: ""
                NuevoTitularScreen(
                    codigoNicho = codigo,
                    onBack      = { navController.popBackStack() },
                    onGuardar   = { navController.popBackStack() }
                )
            }

            // ── Cámara ────────────────────────────────────────────────────────
            composable("camara/{codigo}") { back ->
                val codigo = back.arguments?.getString("codigo") ?: "CAMPO"
                CamaraScreen(
                    codigoNicho    = codigo,
                    onFotoGuardada = { navController.popBackStack() },
                    onBack         = { navController.popBackStack() }
                )
            }

            // ── Campo ─────────────────────────────────────────────────────────
            composable("campo") {
                TrabajosCampoScreen(onNavigate = { navController.navigate(it) })
            }

            // ── Regularización ────────────────────────────────────────────────
            composable("regularizacion") {
                RegularizacionScreen(onBack = { navController.popBackStack() })
            }

            // ── Tasas ─────────────────────────────────────────────────────────
            composable("tasas_economicas") {
                TasasApiScreen(onBack = { navController.popBackStack() })
            }

            // ── Búsqueda global ───────────────────────────────────────────────
            composable("busqueda_global") {
                BusquedaGlobalScreen(
                    onNichoClick = { id -> navController.navigate("nicho_detalle/$id") },
                    onBack       = { navController.popBackStack() }
                )
            }

            // ── Bloque directo ────────────────────────────────────────────────
            composable("bloque/{bloqueId}") { back ->
                val bloqueId = back.arguments?.getString("bloqueId")?.toIntOrNull() ?: return@composable
                NichosApiScreen(
                    bloqueId     = bloqueId,
                    nombreBloque = "Bloque #$bloqueId",
                    onNichoClick = { u -> u.id?.let { navController.navigate("nicho_detalle/$it") } },
                    onBack       = { navController.popBackStack() }
                )
            }

            // ── Estadísticas ──────────────────────────────────────────────────
            composable("estadisticas") {
                EstadisticasScreen(onBack = { navController.popBackStack() })
            }

            // ── Exportar PDF ──────────────────────────────────────────────────
            composable("exportar_pdf") {
                ExportarPdfScreen(onBack = { navController.popBackStack() })
            }

            // ── Portal ciudadano ──────────────────────────────────────────────
            composable("portal_ciudadano") {
                PortalCiudadanoScreen(onBack = { navController.popBackStack() })
            }

            // ── Generar QR ────────────────────────────────────────────────────
            composable("generar_qr") {
                GenerarQrScreen(onBack = { navController.popBackStack() })
            }
        }
    }
}
