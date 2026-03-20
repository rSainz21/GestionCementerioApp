// REEMPLAZA: api-cementerio/src/main/java/com/example/cementerio_api/controladores/UnidadController.java

package com.example.cementerio_api.controladores;

import com.example.cementerio_api.entity.CemenUnidadEnterramiento;
import com.example.cementerio_api.service.UnidadEnterramientoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/unidades")
public class UnidadController {

    @Autowired
    private UnidadEnterramientoService unidadService;

    @GetMapping
    public List<CemenUnidadEnterramiento> listarTodas() {
        return unidadService.listarTodo();
    }

    @GetMapping("/bloque/{bloqueId}")
    public List<CemenUnidadEnterramiento> listarPorBloque(@PathVariable Integer bloqueId) {
        return unidadService.listarPorBloque(bloqueId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<CemenUnidadEnterramiento> obtenerPorId(@PathVariable Integer id) {
        return unidadService.buscarPorId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<CemenUnidadEnterramiento> crear(@RequestBody CemenUnidadEnterramiento unidad) {
        return new ResponseEntity<>(unidadService.guardar(unidad), HttpStatus.CREATED);
    }

    // NUEVO: Actualizar estado de una unidad (Libre → Ocupado, etc.)
    @PutMapping("/{id}")
    public ResponseEntity<CemenUnidadEnterramiento> actualizar(
            @PathVariable Integer id,
            @RequestBody CemenUnidadEnterramiento unidad) {
        return unidadService.buscarPorId(id).map(existente -> {
            if (unidad.getEstado() != null)  existente.setEstado(unidad.getEstado());
            if (unidad.getCodigo() != null)  existente.setCodigo(unidad.getCodigo());
            if (unidad.getLatitud() != null) existente.setLatitud(unidad.getLatitud());
            if (unidad.getLongitud() != null) existente.setLongitud(unidad.getLongitud());
            return ResponseEntity.ok(unidadService.guardar(existente));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/generar-estructura/{bloqueId}")
    public ResponseEntity<String> generarEstructura(@PathVariable Integer bloqueId) {
        unidadService.generarEstructura(bloqueId);
        return ResponseEntity.ok("Estructura de nichos creada correctamente");
    }
}
