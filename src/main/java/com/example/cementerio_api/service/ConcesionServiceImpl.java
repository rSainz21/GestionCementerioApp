package com.example.cementerio_api.service;

import com.example.cementerio_api.entity.CemenConcesion;
import com.example.cementerio_api.entity.CemenTitular;
import com.example.cementerio_api.repository.ConcesionRepository;
import com.example.cementerio_api.repository.TitularRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class ConcesionServiceImpl implements ConcesionService {
    @Autowired private ConcesionRepository concesionRepo;
    @Autowired
    private TitularRepository titularRepo;

    @Override
    public List<CemenConcesion> listarAlertasCaducidad(int meses) {
        LocalDate limite = LocalDate.now().plusMonths(meses);
        return concesionRepo.findProximosVencimientos(LocalDate.now().plusMonths(meses));
    }

    @Override public CemenConcesion registrarNuevaConcesion(CemenConcesion c) { return concesionRepo.save(c); }
    @Override public List<CemenConcesion> historialPorUnidad(Integer id) { return concesionRepo.findByUnidadEnterramientoId(id); }
    @Override public CemenTitular guardarTitular(CemenTitular t) { return titularRepo.save(t); }
}