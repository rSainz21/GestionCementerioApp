package com.example.cementerio_api.controladores;





import java.util.List;

import com.example.cementerio_api.entity.CemenUnidadEnterramiento;
import com.example.cementerio_api.service.UnidadEnterramientoService;
import org.springframework.beans.factory.annotation.Autowired;
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

    @PostMapping("/generar-estructura/{bloqueId}")
    public ResponseEntity<String> generarEstructura(@PathVariable Integer bloqueId) {
        unidadService.generarEstructura(bloqueId);
        return ResponseEntity.ok("Estructura de nichos creada correctamente");
    }
}
