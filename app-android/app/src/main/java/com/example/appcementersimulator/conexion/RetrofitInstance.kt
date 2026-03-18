package com.example.appcementersimulator.conexion

import com.example.appcementersimulator.service.CemenApiService
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object RetrofitInstance {
    private const val BASE_URL = "http://10.10.20.31:3317/"

    val api: CemenApiService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(CemenApiService::class.java)
    }
}