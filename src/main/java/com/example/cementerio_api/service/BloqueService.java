package com.example.cementerio_api.service;

import com.example.cementerio_api.entity.CemenBloque;

import java.util.List;

public interface BloqueService {
    // Listar todos los bloques (Visión general administrativa)
    List<CemenBloque> listarTodos();

    // Filtrar bloques por cementerio (Para la navegación en la App)
    List<CemenBloque> listarPorCementerio(Integer cementerioId);

    // Buscar un bloque específico para edición o detalle
    CemenBloque buscarPorId(Integer id);

    // Guardar o actualizar (Generador Dinámico de Estructuras) [cite: 117]
    CemenBloque guardar(CemenBloque bloque);

    // Eliminar bloque (Solo si no tiene unidades vinculadas)
    void eliminar(Integer id);
}