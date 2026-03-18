package com.example.cementerio_api.service;

import com.example.cementerio_api.entity.CemenDocumento;

import java.util.List;

public interface DocumentoService {
    // Obtener la galería completa de un nicho (Fotos de lápidas, Títulos, Actas) [cite: 168, 171]
    List<CemenDocumento> listarPorUnidad(Integer unidadId);

    // Guardar la ruta de una foto o PDF escaneado [cite: 169]
    CemenDocumento guardar(CemenDocumento documento);

    void eliminar(Integer id);
}