package com.example.cementerio_api.service;

import com.example.cementerio_api.entity.CemenConcesion;
import com.example.cementerio_api.entity.CemenTitular;

import java.util.List;

public interface ConcesionService {
    List<CemenConcesion> listarAlertasCaducidad(int meses);
    CemenConcesion registrarNuevaConcesion(CemenConcesion concesion);
    List<CemenConcesion> historialPorUnidad(Integer unidadId);
    CemenTitular guardarTitular(CemenTitular titular);
}