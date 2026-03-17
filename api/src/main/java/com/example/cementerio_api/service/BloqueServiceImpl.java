package com.example.cementerio_api.service;

import com.example.cementerio_api.entity.CemenBloque;
import com.example.cementerio_api.repository.BloqueRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class BloqueServiceImpl implements BloqueService {
    @Autowired
    private BloqueRepository repo;
    @Override public List<CemenBloque> listarPorCementerio(Integer id) { return repo.findByCementerioId(id); }
    @Override public CemenBloque guardar(CemenBloque b) { return repo.save(b); }
}