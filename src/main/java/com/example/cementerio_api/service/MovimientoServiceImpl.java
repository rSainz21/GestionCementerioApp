package com.example.cementerio_api.service;

import com.example.cementerio_api.entity.CemenMovimiento;
import com.example.cementerio_api.repository.MovimientoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MovimientoServiceImpl implements MovimientoService {
    @Autowired
    private MovimientoRepository repo;
    @Override public List<CemenMovimiento> listarPorResto(Integer id) { return repo.findByRestoId(id); }
    @Override public CemenMovimiento registrar(CemenMovimiento m) { return repo.save(m); }
}
