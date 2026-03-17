package com.example.cementerio_api.service;



import com.example.cementerio_api.entity.CemenRestos;
import com.example.cementerio_api.entity.CemenUnidadEnterramiento;
import com.example.cementerio_api.repository.RestosRepository;
import com.example.cementerio_api.repository.UnidadEnterramientoRepository;
import com.example.cementerio_api.service.RestosService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class RestosServiceImpl implements RestosService {

    @Autowired
    private RestosRepository restosRepo;

    @Autowired
    private UnidadEnterramientoRepository unidadRepo;

    /**
     * Devuelve la 'Bandeja de Regularización' con los 2,108 registros huérfanos[cite: 49].
     * Estos registros proceden de libros antiguos y carecen de ubicación[cite: 128].
     */
    @Override
    public List<CemenRestos> listarHuerfanos() {
        return restosRepo.findByUnidadIsNull();
    }

    /**
     * Permite la asignación una vez identificado el resto en el campo[cite: 129].
     * Es el factor crítico para que el software no sea una 'cáscara vacía'[cite: 187].
     */
    @Override
    @Transactional
    public CemenRestos vincularANicho(Integer restoId, Integer unidadId) {
        CemenRestos resto = restosRepo.findById(restoId)
                .orElseThrow(() -> new RuntimeException("Registro de restos no encontrado"));

        CemenUnidadEnterramiento unidad = unidadRepo.findById(unidadId)
                .orElseThrow(() -> new RuntimeException("Unidad de enterramiento no encontrada"));

        // Vinculamos el resto a su hueco físico real tras verificación in situ
        resto.setUnidad(unidad);

        // Al ocupar el nicho, podríamos actualizar el estado de la unidad a 'OCUPADO'
        unidad.setEstado("OCUPADO");
        unidadRepo.save(unidad);

        return restosRepo.save(resto);
    }

    @Override
    public List<CemenRestos> buscarPorNombre(String nombre) {
        // Facilita la búsqueda de familiares en el portal de consulta o para operarios
        return restosRepo.findByNombreApellidosContainingIgnoreCase(nombre);
    }
}
