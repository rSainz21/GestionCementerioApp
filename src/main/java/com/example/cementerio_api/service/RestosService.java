package com.example.cementerio_api.service;



import com.example.cementerio_api.entity.CemenRestos;
import java.util.List;

public interface RestosService {
    List<CemenRestos> listarHuerfanos();
    CemenRestos vincularANicho(Integer restoId, Integer unidadId);
    List<CemenRestos> buscarPorNombre(String nombre);
    CemenRestos guardar(CemenRestos cemenRestos);
}
