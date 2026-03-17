package com.example.cementerio_api.service;

import com.example.cementerio_api.entity.CemenBloque;
import com.example.cementerio_api.repository.BloqueRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class BloqueServiceImpl implements BloqueService {

    @Autowired
    private BloqueRepository repo;

    @Override
    public List<CemenBloque> listarTodos() {
        return repo.findAll();
    }

    @Override
    public List<CemenBloque> listarPorCementerio(Integer id) {
        // Busca todos los sectores/bloques de un recinto municipal específico
        return repo.findByCementerioId(id);
    }

    @Override
    public CemenBloque buscarPorId(Integer id) {
        return repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Bloque no encontrado con ID: " + id));
    }

    @Override
    @Transactional
    public CemenBloque guardar(CemenBloque b) {
        // Aquí se procesa la creación paramétrica del bloque [cite: 118]
        return repo.save(b);
    }

    @Override
    @Transactional
    public void eliminar(Integer id) {
        // Antes de eliminar, podrías verificar si tiene unidades asignadas
        // para evitar dejar registros "huérfanos" sin estructura [cite: 24]
        CemenBloque bloque = buscarPorId(id);
        repo.delete(bloque);
    }
}