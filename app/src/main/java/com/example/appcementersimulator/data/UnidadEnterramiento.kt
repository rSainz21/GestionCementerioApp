package com.example.appcementersimulator.data


data class UnidadEnterramiento(
    val id: Int,
    val codigo: String,
    val tipo: String,
    val estado: String,
    val latitud: Double?,
    val longitud: Double?
)