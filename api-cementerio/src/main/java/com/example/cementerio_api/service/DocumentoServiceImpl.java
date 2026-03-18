package com.example.cementerio_api.service;

import com.example.cementerio_api.entity.CemenDocumento;
import com.example.cementerio_api.repository.DocumentoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class DocumentoServiceImpl implements DocumentoService {

    @Autowired
    private DocumentoRepository documentoRepository;

    @Override
    public List<CemenDocumento> listarPorUnidad(Integer unidadId) {
        // Esencial para mostrar la identidad visual en la App [cite: 136]
        return documentoRepository.findByUnidadEnterramientoId(unidadId);
    }

    @Override
    public CemenDocumento guardar(CemenDocumento documento) {
        // Registra evidencias de la auditoría visual realizada in situ
        return documentoRepository.save(documento);
    }

    @Override
    public void eliminar(Integer id) {
        documentoRepository.deleteById(id);
    }
}
