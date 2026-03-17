package com.example.cementerio_api.service;

import com.example.cementerio_api.entity.CemenBloque;

import java.util.List;

public interface BloqueService {
    List<CemenBloque> listarPorCementerio(Integer cementerioId);
    CemenBloque guardar(CemenBloque bloque);
}
