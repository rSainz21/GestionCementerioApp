package com.example.cementerio_api.service;



import com.example.cementerio_api.entity.CemenUnidadEnterramiento;
import java.util.List;

public interface UnidadEnterramientoService {
    List<CemenUnidadEnterramiento> listarTodo();
    List<CemenUnidadEnterramiento> listarPorBloque(Integer bloqueId);
    CemenUnidadEnterramiento buscarPorCodigo(String codigo);
    CemenUnidadEnterramiento guardar(CemenUnidadEnterramiento unidad);
    void generarEstructura(Integer bloqueId);
}
