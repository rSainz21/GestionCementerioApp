package com.example.cementerio_api.controladores;


import com.example.cementerio_api.entity.CemenCementerio;
import com.example.cementerio_api.service.CementerioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cementerios")
public class CementerioController {

    @Autowired
    private CementerioService cementerioService;

    @GetMapping
    public ResponseEntity<List<CemenCementerio>> listar() {
        return ResponseEntity.ok(cementerioService.listarTodos());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CemenCementerio> obtenerPorId(@PathVariable Integer id) {
        return ResponseEntity.ok(cementerioService.buscarPorId(id));
    }

    @PostMapping
    public ResponseEntity<CemenCementerio> crear(@RequestBody CemenCementerio cementerio) {
        return ResponseEntity.ok(cementerioService.guardar(cementerio));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CemenCementerio> actualizar(@PathVariable Integer id, @RequestBody CemenCementerio cementerio) {
        CemenCementerio existente = cementerioService.buscarPorId(id);
        cementerio.setId(existente.getId());
        return ResponseEntity.ok(cementerioService.guardar(cementerio));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Integer id) {
        cementerioService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
