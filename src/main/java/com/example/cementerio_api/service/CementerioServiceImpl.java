package com.example.cementerio_api.service;



import com.example.cementerio_api.entity.CemenCementerio;
import com.example.cementerio_api.repository.CementerioRepository;
import com.example.cementerio_api.service.CementerioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CementerioServiceImpl implements CementerioService {

    @Autowired
    private CementerioRepository cementerioRepo;

    @Override
    @Transactional(readOnly = true)
    public List<CemenCementerio> listarTodos() {
        return cementerioRepo.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public CemenCementerio buscarPorId(Integer id) {
        return cementerioRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Cementerio no encontrado con ID: " + id));
    }

    @Override
    @Transactional
    public CemenCementerio guardar(CemenCementerio cementerio) {
        return cementerioRepo.save(cementerio);
    }

    @Override
    @Transactional
    public void eliminar(Integer id) {
        cementerioRepo.deleteById(id);
    }
}
