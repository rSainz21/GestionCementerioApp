package com.corrales.cementerio.data.repository

import android.content.Context
import android.content.SharedPreferences
import com.corrales.cementerio.data.model.SessionData

/**
 * Gestiona la sesión del usuario usando SharedPreferences.
 * Almacena username y rol para mostrar/ocultar funciones según permisos.
 */
object SessionManager {
    private const val PREFS_NAME = "cementerio_session"
    private const val KEY_USER_ID   = "user_id"
    private const val KEY_USERNAME  = "username"
    private const val KEY_ROL       = "rol"
    private const val KEY_LOGGED_IN = "logged_in"

    private lateinit var prefs: SharedPreferences

    fun init(context: Context) {
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun saveSession(session: SessionData) {
        prefs.edit()
            .putInt(KEY_USER_ID, session.userId)
            .putString(KEY_USERNAME, session.username)
            .putString(KEY_ROL, session.rol)
            .putBoolean(KEY_LOGGED_IN, true)
            .apply()
    }

    fun clearSession() {
        prefs.edit().clear().apply()
    }

    fun isLoggedIn(): Boolean = prefs.getBoolean(KEY_LOGGED_IN, false)

    fun getUsername(): String = prefs.getString(KEY_USERNAME, "") ?: ""
    fun getRol(): String = prefs.getString(KEY_ROL, "") ?: ""
    fun getUserId(): Int = prefs.getInt(KEY_USER_ID, 0)
    fun isAdmin(): Boolean = getRol().uppercase() == "ADMIN"
}
