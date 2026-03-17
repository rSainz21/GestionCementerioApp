package com.example.cementerio_api.service;



import com.example.cementerio_api.entity.CemenCementerio;
import java.util.List;

public interface CementerioService {
    List<CemenCementerio> listarTodos();
    CemenCementerio buscarPorId(Integer id);
    CemenCementerio guardar(CemenCementerio cementerio);
    void eliminar(Integer id);
}
