package com.example.cementerio_api.service;



import com.example.cementerio_api.entity.CemenTasaEconomica;

import java.util.List;

public interface TasaEconomicaService {
    List<CemenTasaEconomica> listarTodas();
    List<CemenTasaEconomica> listarImpagos();
    List<CemenTasaEconomica> listarPorUnidad(Integer unidadId);
    CemenTasaEconomica buscarPorId(Integer id);
    CemenTasaEconomica guardar(CemenTasaEconomica tasa);
    CemenTasaEconomica procesarPago(Integer id);
    void eliminar(Integer id);
}
