package com.example.cementerio_api.controladores;

import com.example.cementerio_api.entity.CemenMovimiento;
import com.example.cementerio_api.service.MovimientoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/movimientos")
public class MovimientoController {

    @Autowired
    private MovimientoService movimientoService;

    @GetMapping("/resto/{restoId}")
    public ResponseEntity<List<CemenMovimiento>> listarPorResto(@PathVariable Integer restoId) {
        return ResponseEntity.ok(movimientoService.listarPorResto(restoId));
    }

    @PostMapping
    public ResponseEntity<CemenMovimiento> registrar(@RequestBody CemenMovimiento movimiento) {
        return ResponseEntity.ok(movimientoService.registrar(movimiento));
    }
}