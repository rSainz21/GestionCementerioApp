package com.example.cementerio_api.controladores;

import com.example.cementerio_api.entity.CemenBloque;
import com.example.cementerio_api.service.BloqueService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bloques")
public class BloqueController {

    @Autowired
    private BloqueService bloqueService;

    // Obtener bloques de un cementerio específico (Funcionalidad para el Mapa)
    @GetMapping("/cementerio/{cementerioId}")
    public ResponseEntity<List<CemenBloque>> listarPorCementerio(@PathVariable Integer cementerioId) {
        return ResponseEntity.ok(bloqueService.listarPorCementerio(cementerioId));
    }

    // Crear un nuevo bloque (Inicia el Generador Dinámico de Estructuras)
    @PostMapping
    public ResponseEntity<CemenBloque> crear(@RequestBody CemenBloque bloque) {
        return ResponseEntity.ok(bloqueService.guardar(bloque));
    }

    // Buscar un bloque específico por su ID
    @GetMapping("/{id}")
    public ResponseEntity<CemenBloque> obtenerPorId(@PathVariable Integer id) {
        // Asumiendo que has añadido buscarPorId a tu interfaz BloqueService
        return ResponseEntity.ok(bloqueService.buscarPorId(id));
    }

    // Actualizar configuración del bloque (Filas, columnas o nombre)
    @PutMapping("/{id}")
    public ResponseEntity<CemenBloque> actualizar(@PathVariable Integer id, @RequestBody CemenBloque bloque) {
        CemenBloque existente = bloqueService.buscarPorId(id);
        bloque.setId(existente.getId());
        return ResponseEntity.ok(bloqueService.guardar(bloque));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Integer id) {
        bloqueService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}