package com.example.cementerio_api.service;

import com.example.cementerio_api.entity.CemenTitular;

import java.util.List;
import java.util.Optional;

public interface TitularService {
    List<CemenTitular> listarTodos();
    Optional<CemenTitular> buscarPorId(Integer id);
    Optional<CemenTitular> buscarPorDocumento(String documento); // Para evitar duplicados de DNI [cite: 158]
    CemenTitular guardar(CemenTitular titular);
    void eliminar(Integer id);
}
