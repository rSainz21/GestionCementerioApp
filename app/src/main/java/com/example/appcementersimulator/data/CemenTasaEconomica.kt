package com.example.appcementersimulator.data


import com.google.gson.annotations.SerializedName

data class CemenTasaEconomica(
    @SerializedName("id")
    val id: Int,

    @SerializedName("concepto")
    val concepto: String,

    @SerializedName("importe")
    val importe: Double,

    @SerializedName("estadoPago")
    val estadoPago: String,

    @SerializedName("fechaEmision")
    val fechaEmision: String,

    @SerializedName("unidadId")
    val unidadId: Int? = null
)