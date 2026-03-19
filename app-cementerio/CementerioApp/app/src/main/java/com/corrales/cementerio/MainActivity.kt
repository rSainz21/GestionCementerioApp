package com.corrales.cementerio

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
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
    val currentRoute = backStackEntry?.destination?.route ?: "login"

    // Rutas que NO muestran barra de navegación
    val sinNavBar = listOf("login", "nicho_detalle", "nuevo_nicho", "nuevo_titular",
        "camara", "bloque", "regularizacion", "tasas_economicas")
    val ocultarNav = sinNavBar.any { currentRoute.startsWith(it) }

    val navItems = listOf(
        NavItem("dashboard", "Inicio",   Icons.Default.Dashboard),
        NavItem("mapa",      "Mapa",     Icons.Default.Map),
        NavItem("nichos",    "Nichos",   Icons.Default.GridView),
        NavItem("campo",     "Campo",    Icons.Default.DirectionsWalk),
        NavItem("alertas",   "Alertas",  Icons.Default.Notifications),
    )

    // Destino inicial: login si no hay sesión, dashboard si ya hay sesión
    val startDestination = if (SessionManager.isLoggedIn()) "dashboard" else "login"

    Scaffold(
        bottomBar = {
            if (!ocultarNav) {
                CementerioBottomNav(
                    items = navItems,
                    currentRoute = currentRoute,
                    onItemClick = { route ->
                        navController.navigate(route) {
                            popUpTo(navController.graph.startDestinationId) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                )
            }
        },
        containerColor = NavyDeep
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = startDestination,
            modifier = Modifier.padding(padding)
        ) {
            // ── Auth ─────────────────────────────────────────────────────────
            composable("login") {
                LoginScreen(
                    onLoginSuccess = {
                        navController.navigate("dashboard") {
                            popUpTo("login") { inclusive = true }
                        }
                    }
                )
            }

            // ── Dashboard (con datos reales API) ──────────────────────────────
            composable("dashboard") {
                DashboardApiScreen(
                    onNavigate = { route -> navController.navigate(route) },
                    onLogout = {
                        SessionManager.clearSession()
                        navController.navigate("login") {
                            popUpTo(0) { inclusive = true }
                        }
                    }
                )
            }

            // ── Mapa interactivo ──────────────────────────────────────────────
            composable("mapa") {
                MapaScreen(
                    onNichoClick = { navController.navigate("nicho_detalle/${it.id}") }
                )
            }

            // ── Lista de nichos (sample data - fallback visual) ───────────────
            composable("nichos") {
                NichosScreen(
                    onNichoClick = { navController.navigate("nicho_detalle/${it.id}") }
                )
            }

            // ── Bloque específico con datos reales de la API ──────────────────
            composable("bloque/{bloqueId}") { back ->
                val bloqueId = back.arguments?.getString("bloqueId")?.toIntOrNull() ?: return@composable
                NichosApiScreen(
                    bloqueId = bloqueId,
                    nombreBloque = "Bloque #$bloqueId",
                    onNichoClick = { /* navegar al detalle con unidad de API */ },
                    onBack = { navController.popBackStack() }
                )
            }

            // ── Detalle de nicho ──────────────────────────────────────────────
            composable("nicho_detalle/{id}") { back ->
                val id = back.arguments?.getString("id") ?: ""
                val unidad = com.corrales.cementerio.data.model.SampleData.unidades.find { it.id == id }
                    ?: com.corrales.cementerio.data.model.SampleData.unidades.first()
                NichoDetalleScreen(
                    unidad      = unidad,
                    onBack      = { navController.popBackStack() },
                    onTomarFoto = { navController.navigate("camara/${unidad.codigo}") },
                    onNuevaConcesion = { navController.navigate("nuevo_titular/${unidad.codigo}") }
                )
            }

            // ── Nuevo nicho ───────────────────────────────────────────────────
            composable("nuevo_nicho") {
                NuevoNichoScreen(
                    onBack    = { navController.popBackStack() },
                    onGuardar = { navController.popBackStack() }
                )
            }

            // ── Nuevo titular / concesión ─────────────────────────────────────
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
                val codigo = back.arguments?.getString("codigo") ?: ""
                CamaraScreen(
                    codigoNicho    = codigo,
                    onFotoGuardada = { navController.popBackStack() },
                    onBack         = { navController.popBackStack() }
                )
            }

            // ── Trabajo de campo ──────────────────────────────────────────────
            composable("campo") {
                TrabajosCampoScreen { route -> navController.navigate(route) }
            }

            // ── Alertas ───────────────────────────────────────────────────────
            composable("alertas") {
                AlertasScreen()
            }

            // ── Regularización (Bandeja huérfanos - API real) ─────────────────
            composable("regularizacion") {
                RegularizacionScreen(onBack = { navController.popBackStack() })
            }

            // ── Tasas económicas (API real) ───────────────────────────────────
            composable("tasas_economicas") {
                TasasApiScreen(onBack = { navController.popBackStack() })
            }
        }
    }
}
