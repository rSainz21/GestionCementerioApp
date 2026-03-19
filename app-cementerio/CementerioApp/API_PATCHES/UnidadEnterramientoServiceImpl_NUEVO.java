// REEMPLAZA: api-cementerio/src/main/java/com/example/cementerio_api/service/UnidadEnterramientoServiceImpl.java
// Añade implementación de buscarPorId

package com.example.cementerio_api.service;

import com.example.cementerio_api.entity.CemenBloque;
import com.example.cementerio_api.entity.CemenUnidadEnterramiento;
import com.example.cementerio_api.repository.UnidadEnterramientoRepository;
import com.example.cementerio_api.repository.BloqueRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class UnidadEnterramientoServiceImpl implements UnidadEnterramientoService {

    @Autowired private UnidadEnterramientoRepository unidadRepo;
    @Autowired private BloqueRepository bloqueRepo;

    @Override public List<CemenUnidadEnterramiento> listarTodo() { return unidadRepo.findAll(); }
    @Override public List<CemenUnidadEnterramiento> listarPorBloque(Integer bloqueId) { return unidadRepo.findByBloqueId(bloqueId); }
    @Override public Optional<CemenUnidadEnterramiento> buscarPorCodigo(String codigo) { return unidadRepo.findByCodigo(codigo); }
    @Override public Optional<CemenUnidadEnterramiento> buscarPorId(Integer id) { return unidadRepo.findById(id); }  // NUEVO
    @Override public CemenUnidadEnterramiento guardar(CemenUnidadEnterramiento unidad) { return unidadRepo.save(unidad); }

    @Override
    @Transactional
    public void generarEstructura(Integer bloqueId) {
        CemenBloque bloque = bloqueRepo.findById(bloqueId).orElseThrow();
        for (int f = 1; f <= bloque.getFilas(); f++) {
            for (int c = 1; c <= bloque.getColumnas(); c++) {
                CemenUnidadEnterramiento unidad = new CemenUnidadEnterramiento();
                unidad.setBloque(bloque);
                unidad.setFila(f);
                unidad.setNumero(c);
                unidad.setEstado("Libre");
                unidad.setCodigo(bloque.getNombre() + "-F" + f + "-N" + c);
                unidadRepo.save(unidad);
            }
        }
    }
}
