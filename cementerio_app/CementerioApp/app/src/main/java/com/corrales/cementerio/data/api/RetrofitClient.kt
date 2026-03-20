package com.corrales.cementerio.data.api

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.converter.scalars.ScalarsConverterFactory
import java.util.concurrent.TimeUnit

/**
 * Singleton que provee la instancia de Retrofit.
 * BASE_URL apunta al emulador (10.0.2.2 = localhost del host).
 * Cambiar a la IP real del servidor en producción.
 */
object RetrofitClient {

    // Para emulador Android: 10.0.2.2 == localhost del PC
    // Para dispositivo físico en la misma red: IP local del servidor, ej: 192.168.1.X:8080
    private const val BASE_URL = "http://192.168.100.71:8080/"

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val httpClient = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    val api: ApiService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(httpClient)
            .addConverterFactory(ScalarsConverterFactory.create())
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }
}
