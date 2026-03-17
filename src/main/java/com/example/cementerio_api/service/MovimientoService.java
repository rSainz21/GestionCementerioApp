package com.example.cementerio_api.service;

import com.example.cementerio_api.entity.CemenMovimiento;

import java.util.List;

public interface MovimientoService {
    List<CemenMovimiento> listarPorResto(Integer restoId);
    CemenMovimiento registrar(CemenMovimiento movimiento);
}
