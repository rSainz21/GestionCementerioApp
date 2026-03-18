package com.example.cementerio_api.service;

import com.example.cementerio_api.entity.CemenTitular;
import com.example.cementerio_api.repository.TitularRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class TitularServiceImpl implements TitularService {

    @Autowired
    private TitularRepository titularRepository;

    @Override
    public List<CemenTitular> listarTodos() {
        return titularRepository.findAll();
    }

    @Override
    public Optional<CemenTitular> buscarPorId(Integer id) {
        return titularRepository.findById(id);
    }

    @Override
    public Optional<CemenTitular> buscarPorDocumento(String documento) {
        return titularRepository.findByDocumento(documento);
    }

    @Override
    public CemenTitular guardar(CemenTitular titular) {
        // Lógica para asegurar que no perdemos el rastro de la propiedad [cite: 122]
        return titularRepository.save(titular);
    }

    @Override
    public void eliminar(Integer id) {
        titularRepository.deleteById(id);
    }
}