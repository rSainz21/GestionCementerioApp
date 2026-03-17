package com.example.cementerio_api.service;


import com.example.cementerio_api.entity.CemenTasaEconomica;
import com.example.cementerio_api.repository.TasaEconomicaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.List;

@Service
public class CemenTasaEconomicaServiceImpl implements CemenTasaEconomicaService {

    @Autowired
    private TasaEconomicaRepository tasaRepository;

    @Override
    public List<CemenTasaEconomica> listarTodas() {
        return tasaRepository.findAll();
    }

    @Override
    public List<CemenTasaEconomica> listarImpagos() {
        // Filtra los registros para la gestión inmediata de cobros
        return tasaRepository.findByEstadoPago("IMPAGO");
    }

    @Override
    public List<CemenTasaEconomica> listarPorUnidad(Integer unidadId) {
        return tasaRepository.findByUnidadId(unidadId);
    }

    @Override
    public CemenTasaEconomica buscarPorId(Integer id) {
        return tasaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tasa económica no encontrada con ID: " + id));
    }

    @Override
    public CemenTasaEconomica guardar(CemenTasaEconomica tasa) {
        return tasaRepository.save(tasa);
    }

    @Override
    @Transactional
    public CemenTasaEconomica procesarPago(Integer id) {
        CemenTasaEconomica tasa = buscarPorId(id);
        tasa.setEstadoPago("PAGADO");
        tasa.setFechaPago(LocalDate.now());
        return tasaRepository.save(tasa);
    }

    @Override
    public void eliminar(Integer id) {
        tasaRepository.deleteById(id);
    }
}
