package com.example.cementerio_api.service;



import com.example.cementerio_api.entity.CemenUnidadEnterramiento;
import java.util.List;
import java.util.Optional;

public interface UnidadEnterramientoService {
    List<CemenUnidadEnterramiento> listarTodo();
    List<CemenUnidadEnterramiento> listarPorBloque(Integer bloqueId);
    Optional<CemenUnidadEnterramiento> buscarPorCodigo(String codigo);
    CemenUnidadEnterramiento guardar(CemenUnidadEnterramiento unidad);
    void generarEstructura(Integer bloqueId);
}
